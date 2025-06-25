terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "plutus-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = var.common_tags
}

# ECR Repository
resource "aws_ecr_repository" "plutus" {
  name                 = "plutus-voice-agent"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.common_tags
}

# ECS Cluster
resource "aws_ecs_cluster" "plutus" {
  name = "plutus-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = var.common_tags
}

# Application Load Balancer
resource "aws_lb" "plutus" {
  name               = "plutus-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = false

  tags = var.common_tags
}

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "plutus-alb-sg"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.common_tags
}

# ALB Target Group
resource "aws_lb_target_group" "plutus" {
  name        = "plutus-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = var.common_tags
}

# ALB Listener
resource "aws_lb_listener" "plutus" {
  load_balancer_arn = aws_lb.plutus.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.plutus.arn
  }
}

# ECS Security Group
resource "aws_security_group" "ecs" {
  name        = "plutus-ecs-sg"
  description = "Security group for ECS tasks"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.common_tags
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task_role" {
  name = "ecsTaskRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "plutus" {
  name              = "/ecs/plutus-voice-agent"
  retention_in_days = 30

  tags = var.common_tags
}

# Secrets Manager for API Keys
resource "aws_secretsmanager_secret" "google_api_key" {
  name = "plutus/google-api-key"
  tags = var.common_tags
}

resource "aws_secretsmanager_secret" "layercode_api_key" {
  name = "plutus/layercode-api-key"
  tags = var.common_tags
}

resource "aws_secretsmanager_secret" "layercode_webhook_secret" {
  name = "plutus/layercode-webhook-secret"
  tags = var.common_tags
}

# CodeBuild Project
resource "aws_codebuild_project" "plutus" {
  name          = "plutus-build"
  description   = "Build project for Plutus Voice Agent"
  build_timeout = "10"
  service_role  = aws_iam_role.codebuild_role.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:4.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }

    environment_variable {
      name  = "IMAGE_REPO_NAME"
      value = aws_ecr_repository.plutus.name
    }
  }

  source {
    type = "CODEPIPELINE"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/plutus"
      stream_name = "build-log"
    }
  }

  tags = var.common_tags
}

# CodeBuild IAM Role
resource "aws_iam_role" "codebuild_role" {
  name = "codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "codebuild_policy" {
  role = aws_iam_role.codebuild_role.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Resource = ["*"]
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
      },
      {
        Effect = "Allow"
        Resource = ["*"]
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
      },
      {
        Effect = "Allow"
        Resource = ["*"]
        Action = [
          "ecr:PutImage"
        ]
      }
    ]
  })
}

# CodePipeline
resource "aws_codepipeline" "plutus" {
  name     = "plutus-pipeline"
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = var.github_repository
        BranchName       = var.github_branch
      }
    }
  }

  stage {
    name = "Build"

    action {
      name            = "Build"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["source_output"]
      output_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ProjectName = aws_codebuild_project.plutus.name
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ClusterName = aws_ecs_cluster.plutus.name
        ServiceName = aws_ecs_service.plutus.name
        FileName    = "imagedefinitions.json"
      }
    }
  }
}

# CodePipeline IAM Role
resource "aws_iam_role" "codepipeline_role" {
  name = "codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "codepipeline_policy" {
  name = "codepipeline-policy"
  role = aws_iam_role.codepipeline_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetBucketVersioning",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = "*"
      }
    ]
  })
}

# S3 Bucket for Artifacts
resource "aws_s3_bucket" "artifacts" {
  bucket = "plutus-artifacts-${random_string.bucket_suffix.result}"
  tags   = var.common_tags
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# GitHub Connection
resource "aws_codestarconnections_connection" "github" {
  name          = "github-connection"
  provider_type = "GitHub"
}

# ECS Service
resource "aws_ecs_service" "plutus" {
  name            = "plutus-service"
  cluster         = aws_ecs_cluster.plutus.id
  task_definition = aws_ecs_task_definition.plutus.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs.id]
    subnets          = module.vpc.private_subnets
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.plutus.arn
    container_name   = "plutus-voice-agent"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.plutus]

  tags = var.common_tags
}

# ECS Task Definition
resource "aws_ecs_task_definition" "plutus" {
  family                   = "plutus-voice-agent"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "plutus-voice-agent"
      image = "${aws_ecr_repository.plutus.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        }
      ]
      secrets = [
        {
          name      = "GOOGLE_GENERATIVE_AI_API_KEY"
          valueFrom = aws_secretsmanager_secret.google_api_key.arn
        },
        {
          name      = "LAYERCODE_API_KEY"
          valueFrom = aws_secretsmanager_secret.layercode_api_key.arn
        },
        {
          name      = "LAYERCODE_WEBHOOK_SECRET"
          valueFrom = aws_secretsmanager_secret.layercode_webhook_secret.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.plutus.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = var.common_tags
}

# Auto Scaling
resource "aws_appautoscaling_target" "plutus" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.plutus.name}/${aws_ecs_service.plutus.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "plutus_cpu" {
  name               = "plutus-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.plutus.resource_id
  scalable_dimension = aws_appautoscaling_target.plutus.scalable_dimension
  service_namespace  = aws_appautoscaling_target.plutus.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

resource "aws_appautoscaling_policy" "plutus_memory" {
  name               = "plutus-memory-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.plutus.resource_id
  scalable_dimension = aws_appautoscaling_target.plutus.scalable_dimension
  service_namespace  = aws_appautoscaling_target.plutus.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 70.0
  }
}

# Data sources
data "aws_caller_identity" "current" {}

# Outputs
output "alb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = aws_lb.plutus.dns_name
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository"
  value       = aws_ecr_repository.plutus.repository_url
}

output "github_connection_arn" {
  description = "The ARN of the GitHub connection"
  value       = aws_codestarconnections_connection.github.arn
} 