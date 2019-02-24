<h4>To migrate MongoDB Database Live</h4>
 - Start livesync.js to sync the db oplog in realtime
 - start transfer.sh to copy the whole database
 
 transfer.sh script will not overwrite the mongodb objects which are already migrated by
 livesync.js because transfer.sh is using mongorestore which does not modify objects which 
 are alredy existing.
 
 
 

 
 
 
 
 
 
 Scripts taken from:
 https://mixmax.com/blog/live-migrate-mongo-tip/
 
 Original author: Brad Vogel