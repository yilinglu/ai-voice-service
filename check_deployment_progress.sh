#!/bin/bash
echo "=== Deployment Progress Check $(date) ==="
STATUS=$(aws cloudformation describe-stacks --stack-name PlutusInfrastructureStack-staging --query 'Stacks[0].StackStatus' --output text 2>/dev/null)
echo "Stack Status: $STATUS"

if [[ "$STATUS" == "CREATE_COMPLETE" ]]; then
    echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    # Get the load balancer URL
    aws cloudformation describe-stacks --stack-name PlutusInfrastructureStack-staging --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' --output text 2>/dev/null > lb_url.txt
    echo "Load Balancer URL: $(cat lb_url.txt)"
    echo "Staging URL: https://staging.dragon0.com"
elif [[ "$STATUS" == "ROLLBACK_COMPLETE" || "$STATUS" == "CREATE_FAILED" ]]; then
    echo "❌ DEPLOYMENT FAILED"
    echo "Checking recent errors..."
    aws cloudformation describe-stack-events --stack-name PlutusInfrastructureStack-staging --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`][0:3].{Resource:LogicalResourceId,Reason:ResourceStatusReason}' --output table
elif [[ "$STATUS" == "CREATE_IN_PROGRESS" ]]; then
    echo "⏳ Still in progress..."
    echo "Latest events:"
    aws cloudformation describe-stack-events --stack-name PlutusInfrastructureStack-staging --query 'StackEvents[0:3].{Time:Timestamp,Status:ResourceStatus,Type:ResourceType}' --output table
fi
echo ""
