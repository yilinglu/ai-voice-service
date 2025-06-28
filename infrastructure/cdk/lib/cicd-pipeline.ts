import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export interface CICDPipelineStackProps extends cdk.StackProps {
  domainName: string;
  stagingSubdomain: string;
  productionSubdomain: string;
  stagingHostedZone: route53.IHostedZone;
  productionHostedZone: route53.IHostedZone;
  stagingCertificate: acm.ICertificate;
  productionCertificate: acm.ICertificate;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubTokenSecretName: string;
}

export class CICDPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CICDPipelineStackProps) {
    super(scope, id, props);

    const {
      domainName,
      stagingSubdomain,
      productionSubdomain,
      stagingHostedZone,
      productionHostedZone,
      stagingCertificate,
      productionCertificate,
      githubOwner,
      githubRepo,
      githubBranch,
      githubTokenSecretName,
    } = props;

    // Artifact bucket for pipeline
    const artifactBucket = new s3.Bucket(this, 'PipelineArtifactBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
      autoDeleteObjects: true, // For demo purposes
    });

    // ECR Repository for Docker images
    const ecrRepository = new ecr.Repository(this, 'PlutusECRRepository', {
      repositoryName: 'plutus-voice-agent',
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
    });

    // CodeBuild project for building and testing
    const buildProject = new codebuild.PipelineProject(this, 'PlutusBuildProject', {
      projectName: 'plutus-build-project',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true, // Required for Docker builds
      },
      environmentVariables: {
        ECR_REPOSITORY_URI: {
          value: ecrRepository.repositoryUri,
        },
        IMAGE_TAG: {
          value: '#{codepipeline.PipelineExecutionId}',
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY_URI',
              'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
              'IMAGE_TAG=${COMMIT_HASH:=latest}',
            ],
          },
          build: {
            commands: [
              'echo Build started on `date`',
              'echo Building the Docker image...',
              'docker build -t plutus-app .',
              'docker tag plutus-app:latest $ECR_REPOSITORY_URI:$IMAGE_TAG',
              'docker tag plutus-app:latest $ECR_REPOSITORY_URI:latest',
            ],
          },
          post_build: {
            commands: [
              'echo Build completed on `date`',
              'echo Pushing the Docker image...',
              'docker push $ECR_REPOSITORY_URI:$IMAGE_TAG',
              'docker push $ECR_REPOSITORY_URI:latest',
              'echo Writing image definitions file...',
              'printf \'[{"name":"plutus-app","imageUri":"%s"}]\' $ECR_REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json',
            ],
          },
        },
        artifacts: {
          files: ['imagedefinitions.json'],
        },
      }),
    });

    // Grant permissions to CodeBuild
    ecrRepository.grantPullPush(buildProject);
    artifactBucket.grantReadWrite(buildProject);

    // CodeBuild project for deploying to staging
    const stagingDeployProject = new codebuild.PipelineProject(this, 'StagingDeployProject', {
      projectName: 'plutus-staging-deploy',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      },
      environmentVariables: {
        ENVIRONMENT: { value: 'staging' },
        DOMAIN_NAME: { value: domainName },
        SUBDOMAIN: { value: stagingSubdomain },
        HOSTED_ZONE_ID: { value: stagingHostedZone.hostedZoneId },
        CERTIFICATE_ARN: { value: stagingCertificate.certificateArn },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 18,
            },
            commands: [
              'npm install -g aws-cdk',
            ],
          },
          build: {
            commands: [
              'echo Deploying to staging...',
              'cd infrastructure/cdk',
              'npm install',
              'ENVIRONMENT=staging DOMAIN_NAME=$DOMAIN_NAME SUBDOMAIN=$SUBDOMAIN cdk deploy PlutusInfrastructureStack-staging --require-approval never',
            ],
          },
        },
      }),
    });

    // CodeBuild project for deploying to production
    const productionDeployProject = new codebuild.PipelineProject(this, 'ProductionDeployProject', {
      projectName: 'plutus-production-deploy',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      },
      environmentVariables: {
        ENVIRONMENT: { value: 'prod' },
        DOMAIN_NAME: { value: domainName },
        SUBDOMAIN: { value: productionSubdomain },
        HOSTED_ZONE_ID: { value: productionHostedZone.hostedZoneId },
        CERTIFICATE_ARN: { value: productionCertificate.certificateArn },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 18,
            },
            commands: [
              'npm install -g aws-cdk',
            ],
          },
          build: {
            commands: [
              'echo Deploying to production...',
              'cd infrastructure/cdk',
              'npm install',
              'ENVIRONMENT=prod DOMAIN_NAME=$DOMAIN_NAME SUBDOMAIN=$SUBDOMAIN cdk deploy PlutusInfrastructureStack-prod --require-approval never',
            ],
          },
        },
      }),
    });

    // Grant permissions to deploy projects
    stagingDeployProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:*',
          'ecs:*',
          'ec2:*',
          'iam:*',
          'logs:*',
          'secretsmanager:*',
          'route53:*',
          'acm:*',
          'elasticloadbalancing:*',
          'autoscaling:*',
          'cloudwatch:*',
          's3:*',
        ],
        resources: ['*'],
      })
    );

    productionDeployProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:*',
          'ecs:*',
          'ec2:*',
          'iam:*',
          'logs:*',
          'secretsmanager:*',
          'route53:*',
          'acm:*',
          'elasticloadbalancing:*',
          'autoscaling:*',
          'cloudwatch:*',
          's3:*',
        ],
        resources: ['*'],
      })
    );

    // Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'PlutusPipeline', {
      pipelineName: 'plutus-voice-agent-pipeline',
      artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'Source',
              owner: githubOwner,
              repo: githubRepo,
              branch: githubBranch,
              oauthToken: cdk.SecretValue.secretsManager(githubTokenSecretName),
              output: new codepipeline.Artifact('Source'),
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: new codepipeline.Artifact('Source'),
              outputs: [new codepipeline.Artifact('Build')],
            }),
          ],
        },
        {
          stageName: 'DeployToStaging',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'DeployToStaging',
              project: stagingDeployProject,
              input: new codepipeline.Artifact('Source'),
            }),
          ],
        },
        {
          stageName: 'ApproveProduction',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'ApproveProductionDeploy',
              notificationTopic: undefined, // You can add SNS topic for notifications
              additionalInformation: 'Deploy to production?',
            }),
          ],
        },
        {
          stageName: 'DeployToProduction',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'DeployToProduction',
              project: productionDeployProject,
              input: new codepipeline.Artifact('Source'),
            }),
          ],
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'PipelineURL', {
      value: `https://${this.region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline.pipelineName}/view`,
      description: 'URL to the CodePipeline console',
      exportName: 'plutus-pipeline-url',
    });

    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: ecrRepository.repositoryUri,
      description: 'ECR repository URI for Docker images',
      exportName: 'plutus-ecr-repository-uri',
    });

    new cdk.CfnOutput(this, 'StagingURL', {
      value: `https://${stagingSubdomain}.${domainName}`,
      description: 'Staging environment URL',
      exportName: 'plutus-staging-url',
    });

    new cdk.CfnOutput(this, 'ProductionURL', {
      value: `https://${productionSubdomain}.${domainName}`,
      description: 'Production environment URL',
      exportName: 'plutus-production-url',
    });
  }
} 