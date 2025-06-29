There is a bug in Cursor app's built-in terminal, you therefore will not be able to capture the terminal output in regular ways, the workaroudn is to write the output to a file and then cat the file to read the content.
The following example is the other alternative to workaround the bug:
`./scripts/deploy.sh staging | tee deploy_output.txt`

Before building any environments (staging, prod, beta, gamma, etc), always verify that there are no orphaned resources of all kinds (including but not limited to: ECS clusers, VPCs, subnets, gateways, cloudwatch log groups, cloudwatch resources, unused ECR images, docker images)

the orphaned resource check scripts should delete the orphaned resources as it finds them.

Best Practice for Future
The safest approach would be:
Start the CDK deployment and let it run
Use the AWS Console to monitor progress (no CLI interference)
Only use CLI commands after the deployment completes or if you need to troubleshoot
Or use a monitoring script (like this following, but depending on the env being deployment, the stack name and other variable will differ and needs to be adjusted on every run):
```
# Create a monitoring script
cat > monitor_deployment.sh << 'EOF'
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
EOF
chmod +x monitor_deployment.sh
./monitor_deployment.sh &
```

you are always running into 
head: |: No such file or directory
head: cat: No such file or directory
can you remember the workaround forever? what is your workaroun?

check with me before deleting any .json file, don't delete any json file on your own.