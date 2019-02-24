/**
 * This script will automatically sync all updates from one database to another. It is meant to be run while
 * syncing the database using mongodump and mongorestore.
 *
 * Example:
 *  node livesync.js mongodb://<user>:<pass>@dbhost.com:10645/app-production \
 *		mongodb://<user>:<pass>@dbhost.com:10499/local?authSource=app-production \
 *		app-production \
 *		mongodb://<user>:<pass>@newdbhost.com/app-prod
 */

const mongojs = require('mongojs')
let MongoOplog = require('mongo-oplog')

let fromDbUrl = process.argv[2] || "mongodb://localhost:27017/react_app"
let fromDbOplogUrl = process.argv[3] || "mongodb://localhost:27017/local?authSource=react_app"
let fromDbName = process.argv[4] || "react_app"
let toDbUrl = process.argv[5] || "mongodb://localhost:27019/react_app"

let fromDb = mongojs(fromDbUrl)
fromDb.on('error', function (err) {
    console.log(`Can't connect to 'from' db`, err)
    process.exit(1)
})

let toDb = mongojs(toDbUrl)
toDb.on('error', function (err) {
    console.log(`Can't connect to 'to' db`, err)
    process.exit(1)
})

let oplog = MongoOplog(fromDbOplogUrl, {
    ns: fromDbName + ".*"
})

oplog.tail()

oplog.on('op', data => {
    console.log(data);
});

oplog.on('insert', function (doc) {
    let id = doc.o._id
    let ns = stripNamespace(doc.ns)
    syncObject(ns, id)
})

oplog.on('update', function (doc) {
    let id = doc.o2._id
    let ns = stripNamespace(doc.ns)
    syncObject(ns, id)
})

oplog.on('error', function (error) {
    console.log(error)
})

oplog.on('end', function () {
    console.error('Stream ended')
})

// oplog.stop(function () {
//     console.error('server stopped')
// })


// Strips the namespace from the oplog update.
function stripNamespace(namespace) {
    return namespace.replace(new RegExp(`^${fromDbName}\.`), '')
}

// Grabs an object from the 'from' db and moves it to the 'to' db.
function syncObject(ns, id) {
    fromDb.collection(ns).findOne({
        _id: id
    }, (err, res) => {
        if (err) {
            console.error(`ERROR: could not find document to insert with id ${id}`, err)
        } else if (!res) {
            console.error(`ERROR: got oplog message but couldn't find ${id}`)
        } else {
            console.log(`syncing ${ns}`)
            toDb.collection(ns).update({
                _id: id
            }, res, {
                upsert: true
            }, (err, res) => {
                if (err) console.error(`ERROR: upserting doc`, err)
            })
        }
    })
}