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

export interface PlutusInfrastructureStackProps extends cdk.StackProps {
  environment: string;
}

export class PlutusInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PlutusInfrastructureStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // VPC Configuration
    const vpc = new ec2.Vpc(this, 'PlutusVPC', {
      maxAzs: 2,
      natGateways: 1, // Cost optimization: single NAT gateway
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

    // Secrets Manager for environment variables
    const appSecrets = new secretsmanager.Secret(this, 'PlutusAppSecrets', {
      secretName: `plutus-app-secrets-${environment}`,
      description: 'Secrets for Plutus voice agent application',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          LAYERCODE_API_KEY: 'your_layercode_api_key_here',
          LAYERCODE_WEBHOOK_SECRET: 'your_webhook_secret_here',
          GOOGLE_GENERATIVE_AI_API_KEY: 'your_google_ai_api_key_here',
        }),
        generateStringKey: 'password',
      },
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'PlutusCluster', {
      vpc,
      clusterName: `plutus-cluster-${environment}`,
      containerInsights: true,
      enableFargateCapacityProviders: true,
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'PlutusTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
      executionRole: this.createExecutionRole(),
      taskRole: this.createTaskRole(),
    });

    // Container Definition
    const container = taskDefinition.addContainer('PlutusContainer', {
      image: ecs.ContainerImage.fromAsset('../plutus'),
      containerName: 'plutus-app',
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'plutus',
        logRetention: logs.RetentionDays.ONE_MONTH,
      }),
      environment: {
        NODE_ENV: environment,
        PORT: '3000',
      },
      secrets: {
        LAYERCODE_API_KEY: ecs.Secret.fromSecretsManager(appSecrets, 'LAYERCODE_API_KEY'),
        LAYERCODE_WEBHOOK_SECRET: ecs.Secret.fromSecretsManager(appSecrets, 'LAYERCODE_WEBHOOK_SECRET'),
        GOOGLE_GENERATIVE_AI_API_KEY: ecs.Secret.fromSecretsManager(appSecrets, 'GOOGLE_GENERATIVE_AI_API_KEY'),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // Application Load Balancer
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'PlutusALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: `plutus-alb-${environment}`,
    });

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'PlutusTargetGroup', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/api/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // Listener
    const listener = loadBalancer.addListener('PlutusListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    // ECS Service
    const service = new ecs.FargateService(this, 'PlutusService', {
      cluster,
      taskDefinition,
      serviceName: `plutus-service-${environment}`,
      desiredCount: environment === 'prod' ? 2 : 1,
      assignPublicIp: false, // Use private subnets for security
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Attach service to target group
    service.attachToApplicationTargetGroup(targetGroup);

    // Auto Scaling
    const scaling = service.autoScaleTaskCount({
      minCapacity: environment === 'prod' ? 2 : 1,
      maxCapacity: environment === 'prod' ? 10 : 3,
    });

    // Scale up on CPU utilization
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Scale up on memory utilization
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Security Group for the service
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'PlutusServiceSG', {
      vpc,
      description: 'Security group for Plutus ECS service',
      allowAllOutbound: true,
    });

    serviceSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      'Allow inbound traffic to Plutus app'
    );

    service.connections.addSecurityGroup(serviceSecurityGroup);

    // CloudWatch Dashboard
    this.createCloudWatchDashboard(cluster, service, loadBalancer, environment);

    // CI/CD Pipeline (optional - can be enabled later)
    // this.createCICDPipeline(environment);

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: loadBalancer.loadBalancerDnsName,
      description: 'DNS name of the load balancer',
      exportName: `plutus-alb-dns-${environment}`,
    });

    new cdk.CfnOutput(this, 'ServiceURL', {
      value: `http://${loadBalancer.loadBalancerDnsName}`,
      description: 'URL of the Plutus service',
      exportName: `plutus-service-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'Name of the ECS cluster',
      exportName: `plutus-cluster-name-${environment}`,
    });

    new cdk.CfnOutput(this, 'SecretsName', {
      value: appSecrets.secretName,
      description: 'Name of the secrets in Secrets Manager',
      exportName: `plutus-secrets-name-${environment}`,
    });
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

  private createCloudWatchDashboard(
    cluster: ecs.Cluster,
    service: ecs.FargateService,
    loadBalancer: elbv2.ApplicationLoadBalancer,
    environment: string
  ): void {
    const dashboard = new cloudwatch.Dashboard(this, 'PlutusDashboard', {
      dashboardName: `plutus-dashboard-${environment}`,
    });

    // ECS Service Metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ECS Service CPU Utilization',
        left: [
          service.metricCpuUtilization({
            period: cdk.Duration.minutes(1),
            statistic: 'Average',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'ECS Service Memory Utilization',
        left: [
          service.metricMemoryUtilization({
            period: cdk.Duration.minutes(1),
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    );

    // Load Balancer Metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Load Balancer Request Count',
        left: [
          loadBalancer.metricRequestCount({
            period: cdk.Duration.minutes(1),
            statistic: 'Sum',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Load Balancer Response Time',
        left: [
          loadBalancer.metricTargetResponseTime({
            period: cdk.Duration.minutes(1),
            statistic: 'Average',
          }),
        ],
        width: 12,
      })
    );

    // Error Rate Widget
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'HTTP 5XX Error Rate',
        left: [
          loadBalancer.metricHttpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT, {
            period: cdk.Duration.minutes(1),
            statistic: 'Sum',
          }),
        ],
        width: 24,
      })
    );
  }

  private createCICDPipeline(environment: string): void {
    // This method can be implemented later for CI/CD automation
    // It would include CodePipeline, CodeBuild, and GitHub integration
  }
} 