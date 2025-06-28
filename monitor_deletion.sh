#!/bin/bash
STACK_NAME="PlutusInfrastructureStack-staging"
LOG_FILE="deletion_monitor.log"

echo "$(date): Starting deletion monitoring..." > $LOG_FILE
echo "$(date): Monitoring stack: $STACK_NAME" >> $LOG_FILE
echo "$(date): Tail this file: tail -f $LOG_FILE" >> $LOG_FILE
echo "==========================================" >> $LOG_FILE

while true; do
    echo "$(date): Checking deletion status..." >> $LOG_FILE
    
    STATUS=$(aws cloudformation list-stacks --stack-status-filter DELETE_IN_PROGRESS | grep -c "$STACK_NAME" 2>/dev/null || echo "0")
    
    if [ "$STATUS" -eq 0 ]; then
        echo "$(date): ✅ Stack deletion completed!" >> $LOG_FILE
        break
    else
        echo "$(date): Still deleting..." >> $LOG_FILE
    fi
    
    echo "------------------------------------------" >> $LOG_FILE
    sleep 30
done

echo "$(date): Deletion monitoring completed." >> $LOG_FILE
