#!/bin/bash
STACK_NAME="PlutusInfrastructureStack-prod"
SERVICE_NAME="plutus-service-prod" 
CLUSTER_NAME="plutus-cluster-prod"

echo "$(date): Starting production deployment monitoring..." 
echo "$(date): Stack: $STACK_NAME"
echo "$(date): Service: $SERVICE_NAME"
echo "$(date): Cluster: $CLUSTER_NAME"
echo "$(date): URL: https://api.dragon0.com"
echo "==========================================" 

while true; do
    # Check CloudFormation stack status
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null)
    echo "$(date): CloudFormation Status: $STACK_STATUS"
    
    # Check ECS service status
    ECS_STATUS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}' --output text 2>/dev/null)
    echo "$(date): ECS Service: $ECS_STATUS"
    
    # Check for running tasks
    RUNNING_TASKS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --desired-status RUNNING --query 'taskArns' --output text 2>/dev/null)
    if [ -z "$RUNNING_TASKS" ]; then
        echo "$(date): Running Tasks: 0"
    else
        echo "$(date): Running Tasks: $(echo $RUNNING_TASKS | wc -w)"
    fi
    
    # Test health endpoint
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.dragon0.com/api/health 2>/dev/null)
    echo "$(date): Health Check: HTTP $HEALTH_STATUS"
    
    # Check if everything is ready
    if [[ "$STACK_STATUS" == "CREATE_COMPLETE" ]] && [[ "$HEALTH_STATUS" == "200" ]]; then
        echo "$(date): ✅ PRODUCTION DEPLOYMENT SUCCESSFUL!"
        echo "$(date): Service URL: https://api.dragon0.com"
        echo "$(date): Health endpoint: https://api.dragon0.com/api/health"
        break
    fi
    
    echo "------------------------------------------"
    sleep 30
done

echo "$(date): Production monitoring completed."
