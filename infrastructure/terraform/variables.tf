variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "github_repository" {
  description = "GitHub repository (format: owner/repo)"
  type        = string
  default     = "your-username/ai-voice-service"
}

variable "github_branch" {
  description = "GitHub branch to deploy"
  type        = string
  default     = "main"
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "plutus-voice-agent"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "your-domain.com"
}

variable "certificate_arn" {
  description = "SSL certificate ARN for HTTPS"
  type        = string
  default     = ""
} 