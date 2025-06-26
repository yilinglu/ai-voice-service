import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CICDPipelineProps {
  environment: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubTokenSecretName: string;
}

export class CICDPipeline extends Construct {
  constructor(scope: Construct, id: string, props: CICDPipelineProps) {
    super(scope, id);

    const { environment, githubOwner, githubRepo, githubBranch, githubTokenSecretName } = props;

    // Get account and region from the stack
    const stack = cdk.Stack.of(this);

    // S3 bucket for artifacts
    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      bucketName: `plutus-artifacts-${environment}-${stack.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // CodeBuild project for building and testing
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: `plutus-build-${environment}`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      environmentVariables: {
        ENVIRONMENT: {
          value: environment,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws --version',
              'node --version',
              'npm --version',
            ],
          },
          build: {
            commands: [
              'echo Build started on `date`',
              'cd plutus',
              'npm ci',
              'npm run build',
              'npm test',
              'echo Build completed on `date`',
            ],
          },
          post_build: {
            commands: [
              'echo Build completed on `date`',
              'echo Pushing the Docker image...',
              'docker build -t plutus-app .',
              'echo Build completed successfully!',
            ],
          },
        },
        artifacts: {
          files: [
            'plutus/**/*',
            'infrastructure/**/*',
          ],
          'discard-paths': 'no',
        },
      }),
    });

    // CodeBuild project for deployment
    const deployProject = new codebuild.PipelineProject(this, 'DeployProject', {
      projectName: `plutus-deploy-${environment}`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      },
      environmentVariables: {
        ENVIRONMENT: {
          value: environment,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Installing CDK...',
              'npm install -g aws-cdk',
              'cd infrastructure/cdk',
              'npm ci',
            ],
          },
          build: {
            commands: [
              'echo Deploying infrastructure...',
              'export ENVIRONMENT=$ENVIRONMENT',
              'npx cdk deploy --all --require-approval never',
              'echo Deployment completed!',
            ],
          },
        },
      }),
    });

    // Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'PlutusPipeline', {
      pipelineName: `plutus-pipeline-${environment}`,
      artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: githubOwner,
              repo: githubRepo,
              branch: githubBranch,
              oauthToken: cdk.SecretValue.secretsManager(githubTokenSecretName),
              output: new codepipeline.Artifact('SourceArtifact'),
              triggerOnPush: true,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: new codepipeline.Artifact('SourceArtifact'),
              outputs: [new codepipeline.Artifact('BuildArtifact')],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Deploy',
              project: deployProject,
              input: new codepipeline.Artifact('BuildArtifact'),
            }),
          ],
        },
      ],
    });

    // Grant permissions to CodeBuild projects
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
          'ecr:PutImage',
          'ecr:InitiateLayerUpload',
          'ecr:UploadLayerPart',
          'ecr:CompleteLayerUpload',
        ],
        resources: ['*'],
      })
    );

    deployProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:*',
          'ecs:*',
          'ec2:*',
          'iam:*',
          'logs:*',
          'secretsmanager:*',
          'elasticloadbalancing:*',
          'cloudwatch:*',
        ],
        resources: ['*'],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'PipelineURL', {
      value: `https://console.aws.amazon.com/codepipeline/home?region=${stack.region}#/view/${pipeline.pipelineName}`,
      description: 'URL to the CodePipeline console',
      exportName: `plutus-pipeline-url-${environment}`,
    });
  }
} 