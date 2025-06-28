#!/bin/bash
LOG_FILE="deployment_monitor.log"
STACK_NAME="PlutusInfrastructureStack-staging"

echo "$(date): Starting deployment monitoring..." > $LOG_FILE
echo "$(date): Monitoring stack: $STACK_NAME" >> $LOG_FILE
echo "$(date): Log file: $LOG_FILE" >> $LOG_FILE
echo "$(date): Tail this file in another terminal: tail -f $LOG_FILE" >> $LOG_FILE
echo "==========================================" >> $LOG_FILE

while true; do
    echo "$(date): Checking deployment status..." >> $LOG_FILE
    
    # Check CloudFormation stack status
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null)
    echo "$(date): CloudFormation Status: $STACK_STATUS" >> $LOG_FILE
    
    # Check ECS service status
    ECS_STATUS=$(aws ecs describe-services --cluster plutus-cluster-staging --services plutus-service-staging --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}' --output text 2>/dev/null)
    echo "$(date): ECS Service: $ECS_STATUS" >> $LOG_FILE
    
    # Check for running tasks
    RUNNING_TASKS=$(aws ecs list-tasks --cluster plutus-cluster-staging --desired-status RUNNING --query 'taskArns' --output text 2>/dev/null)
    if [ -z "$RUNNING_TASKS" ]; then
        echo "$(date): Running Tasks: 0" >> $LOG_FILE
    else
        echo "$(date): Running Tasks: $(echo $RUNNING_TASKS | wc -w)" >> $LOG_FILE
    fi
    
    # Check latest CloudFormation events
    LATEST_EVENT=$(aws cloudformation describe-stack-events --stack-name $STACK_NAME --query 'StackEvents[0].{Resource:LogicalResourceId,Status:ResourceStatus,Time:Timestamp}' --output text 2>/dev/null)
    echo "$(date): Latest CF Event: $LATEST_EVENT" >> $LOG_FILE
    
    # Check if deployment is complete
    if [[ "$STACK_STATUS" == "CREATE_COMPLETE" || "$STACK_STATUS" == "UPDATE_COMPLETE" ]]; then
        echo "$(date): ✅ DEPLOYMENT COMPLETED SUCCESSFULLY!" >> $LOG_FILE
        echo "$(date): Stack status: $STACK_STATUS" >> $LOG_FILE
        break
    fi
    
    if [[ "$STACK_STATUS" == "CREATE_FAILED" || "$STACK_STATUS" == "ROLLBACK_COMPLETE" ]]; then
        echo "$(date): ❌ DEPLOYMENT FAILED!" >> $LOG_FILE
        echo "$(date): Stack status: $STACK_STATUS" >> $LOG_FILE
        break
    fi
    
    echo "------------------------------------------" >> $LOG_FILE
    sleep 30
done

echo "$(date): Monitoring completed." >> $LOG_FILE
