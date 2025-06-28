#!/bin/bash
STACK_NAME="PlutusInfrastructureStack-staging"
while true; do
    STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null)
    echo "$(date): $STATUS"
    if [[ "$STATUS" == "CREATE_COMPLETE" || "$STATUS" == "UPDATE_COMPLETE" || "$STATUS" == "ROLLBACK_COMPLETE" ]]; then
        echo "Deployment finished with status: $STATUS"
        break
    fi
    sleep 30
done
