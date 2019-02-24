#!/bin/bash

#
# This script will transfer data from one database to another host. See parameters below
#
# Example:
#	./migration_script.sh dbhost.com:10499 app-production migrate 1234 newdbhost:27017 app-prod migrate 1234
#	./migration_script.sh dbhost.com:10499 app-production newdbhost:27017 app-prod
#
#

# Temporary directory where to keep indexes
TMP_INDEX_DIRECTORY=`mktemp -d`

# Number of cores
NUM_WORKERS=`nproc`

OUTBOUND_CONNECTION_STRING=$1
OUTBOUND_DATABASE_NAME=$2


INBOUND_CONNECTION_STRING=$3
INBOUND_DATABASE_NAME=$4


COLLECTIONS=$(mongo $OUTBOUND_CONNECTION_STRING/$OUTBOUND_DATABASE_NAME --eval 'db.getCollectionNames()' | awk '{print $2}' FS='"' ORS=' ' | tr '\t' ' ')

for COLLECTION in ${COLLECTIONS[@]}; do
    echo "DUMPING INDEXES"
    mongodump --host $OUTBOUND_CONNECTION_STRING --db $OUTBOUND_DATABASE_NAME --collection $COLLECTION --query '{ "_id": 0 }' --out $TMP_INDEX_DIRECTORY

    echo "RESTORING INDEXES"
    mongorestore --numInsertionWorkersPerCollection=$NUM_WORKERS --host $INBOUND_CONNECTION_STRING --db $INBOUND_DATABASE_NAME --collection $COLLECTION $TMP_INDEX_DIRECTORY/$OUTBOUND_DATABASE_NAME/$COLLECTION.bson

    echo "DUMPING AND LOADING DATA FROM STDOUT/STDIN"
    mongodump --host $OUTBOUND_CONNECTION_STRING --db $OUTBOUND_DATABASE_NAME --collection $COLLECTION --out - | mongorestore --numInsertionWorkersPerCollection=$NUM_WORKERS --host $INBOUND_CONNECTION_STRING --db $INBOUND_DATABASE_NAME --collection $COLLECTION -

    echo "DONE"
done