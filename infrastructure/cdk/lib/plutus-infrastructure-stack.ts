import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface PlutusInfrastructureStackProps extends cdk.StackProps {
  environment: string;
  domainName?: string;
  subdomain?: string;
  imageTag?: string; // Optional: if not provided, will use 'latest'
}

export class PlutusInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PlutusInfrastructureStackProps) {
    super(scope, id, props);

    const { environment, domainName, subdomain, imageTag = 'latest' } = props;

    // Validate secrets before proceeding with deployment
    this.validateSecrets(environment);

    // Import hosted zone and certificate if subdomain is provided
    let hostedZone: route53.IHostedZone | undefined;
    let certificate: acm.ICertificate | undefined;

    if (subdomain && domainName) {
      const fullDomain = `${subdomain}.${domainName}`;
      
      console.log(`Setting up for subdomain: ${subdomain}`);
      console.log(`Full domain: ${fullDomain}`);
      
      // Use hosted zone ID directly from the domain infrastructure stack
      const hostedZoneId = cdk.Fn.importValue(`plutus-hosted-zone-id-${subdomain}`);
      hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone${subdomain}`, {
        hostedZoneId: hostedZoneId,
        zoneName: fullDomain,
      });
      
      // Use certificate ARN directly from the domain infrastructure stack
      const certificateArn = cdk.Fn.importValue(`plutus-certificate-arn-${subdomain}`);
      certificate = acm.Certificate.fromCertificateArn(
        this,
        `Certificate${subdomain}`,
        certificateArn
      );
      
      console.log(`Hosted zone ID: ${hostedZoneId}`);
      console.log(`Certificate ARN: ${certificateArn}`);
    }

    console.log(`Using Docker image tag: ${imageTag}`);

    // VPC Configuration
    const vpc = new ec2.Vpc(this, 'PlutusVPC', {
      maxAzs: 2,
      natGateways: 1, // Add NAT Gateway for private subnets
      vpcName: `plutus-vpc-${environment}`,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // VPC Endpoints for enhanced security (for staging and production)
    if (environment === 'staging' || environment === 'prod') {
      // Secrets Manager VPC Endpoint
      new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
        vpc,
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      });

      // CloudWatch Logs VPC Endpoint
      new ec2.InterfaceVpcEndpoint(this, 'CloudWatchLogsEndpoint', {
        vpc,
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      });

      // ECR VPC Endpoint
      new ec2.InterfaceVpcEndpoint(this, 'ECREndpoint', {
        vpc,
        service: ec2.InterfaceVpcEndpointAwsService.ECR,
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      });

      // ECR Docker VPC Endpoint
      new ec2.InterfaceVpcEndpoint(this, 'ECRDockerEndpoint', {
        vpc,
        service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      });
    }

    // ECR Repository for the application
    const repository = ecr.Repository.fromRepositoryName(
      this,
      'PlutusRepository',
      'plutus-server'
    );

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'PlutusCluster', {
      vpc,
      clusterName: `plutus-cluster-${environment}`,
      containerInsights: true,
    });

    // Domain and SSL Certificate setup
    let domainNameFull: string | undefined;
    let domainNameForALB: string | undefined;

    if (domainName && subdomain) {
      domainNameFull = `${subdomain}.${domainName}`;
      domainNameForALB = domainNameFull; // Use the full domain name for ALB
    }

    // Create the Fargate service with Application Load Balancer
    const loadBalancedFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      'PlutusService',
      {
        memoryLimitMiB: 1024,
        cpu: 512,
        desiredCount: 1,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(repository, imageTag),
          containerPort: 3000,
          environment: {
            NODE_ENV: environment,
            NEXT_PUBLIC_LAYERCODE_PIPELINE_ID: 'e0y2kgye',
          },
          secrets: {
            LAYERCODE_API_KEY: ecs.Secret.fromSecretsManager(
              secretsmanager.Secret.fromSecretCompleteArn(this, 'LayercodeApiKey', 'arn:aws:secretsmanager:us-east-1:526623580264:secret:layercode/api-key-Ziikpm')
            ),
            LAYERCODE_WEBHOOK_SECRET: ecs.Secret.fromSecretsManager(
              secretsmanager.Secret.fromSecretCompleteArn(this, 'LayercodeWebhookSecret', 'arn:aws:secretsmanager:us-east-1:526623580264:secret:layercode/webhook-secret-GaX56e')
            ),
            GOOGLE_GENERATIVE_AI_API_KEY: ecs.Secret.fromSecretsManager(
              secretsmanager.Secret.fromSecretCompleteArn(this, 'GoogleGenerativeAIKey', 'arn:aws:secretsmanager:us-east-1:526623580264:secret:google/generative-ai-key-K9jUHu')
            ),
          },
          logDriver: ecs.LogDrivers.awsLogs({
            streamPrefix: 'plutus',
            logRetention: logs.RetentionDays.ONE_MONTH,
          }),
          executionRole: this.createExecutionRole(),
          taskRole: this.createTaskRole(),
        },
        cluster,
        domainName: domainNameForALB,
        domainZone: hostedZone,
        certificate,
        protocol: domainName && subdomain ? elbv2.ApplicationProtocol.HTTPS : elbv2.ApplicationProtocol.HTTP,
        redirectHTTP: domainName && subdomain ? true : false,
        publicLoadBalancer: true,
        loadBalancerName: `plutus-alb-${environment}`,
        serviceName: `plutus-service-${environment}`,
      }
    );

    // Auto Scaling
    const scaling = loadBalancedFargateService.service.autoScaleTaskCount({
      maxCapacity: 10,
      minCapacity: 1,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'PlutusDashboard', {
      dashboardName: `plutus-dashboard-${environment}`,
    });

    // Add metrics to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CPU Utilization',
        left: [loadBalancedFargateService.service.metricCpuUtilization()],
        right: [loadBalancedFargateService.service.metricMemoryUtilization()],
      }),
      new cloudwatch.GraphWidget({
        title: 'Request Count',
        left: [loadBalancedFargateService.loadBalancer.metrics.requestCount()],
      }),
      new cloudwatch.GraphWidget({
        title: 'Target Response Time',
        left: [loadBalancedFargateService.loadBalancer.metrics.targetResponseTime()],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: loadBalancedFargateService.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
      exportName: `plutus-loadbalancer-dns-${environment}`,
    });

    new cdk.CfnOutput(this, 'ServiceURL', {
      value: domainName && subdomain 
        ? `https://${domainNameFull}` 
        : `http://${loadBalancedFargateService.loadBalancer.loadBalancerDnsName}`,
      description: 'Service URL',
      exportName: `plutus-service-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `plutus-ecr-repository-uri-${environment}`,
    });

    new cdk.CfnOutput(this, 'DockerImageTag', {
      value: imageTag,
      description: 'Docker Image Tag',
      exportName: `plutus-docker-image-tag-${environment}`,
    });

    // Add tags
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Service', 'plutus-voice-agent');
    cdk.Tags.of(this).add('ManagedBy', 'cdk');
  }

  private createExecutionRole(): iam.Role {
    return new iam.Role(this, 'PlutusExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
      inlinePolicies: {
        SecretsAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'kms:Decrypt',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });
  }

  private createTaskRole(): iam.Role {
    return new iam.Role(this, 'PlutusTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });
  }

  private createCICDPipeline(environment: string): void {
    // This method can be implemented later for CI/CD automation
    // It would include CodePipeline, CodeBuild, and GitHub integration
  }

  private validateSecrets(environment: string): void {
    const requiredSecrets = [
      'layercode/api-key',
      'layercode/webhook-secret', 
      'google/generative-ai-key'
    ];

    console.log(`🔍 Validating secrets for environment: ${environment}`);
    
    requiredSecrets.forEach(secretName => {
      try {
        const secret = secretsmanager.Secret.fromSecretNameV2(this, `SecretValidation-${secretName.replace('/', '-')}`, secretName);
        console.log(`✅ Secret validated: ${secretName}`);
      } catch (error) {
        console.error(`❌ Secret validation failed: ${secretName}`);
        throw new Error(`Required secret '${secretName}' not found or not accessible`);
      }
    });
    
    console.log('🎉 All secrets validated successfully');
  }
} 