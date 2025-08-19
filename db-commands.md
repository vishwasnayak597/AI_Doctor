# MongoDB Database Management Reference

## Quick Connection
```bash
mongosh aidoc
```

## Basic Queries

### View All Users
```javascript
db.users.find().pretty()
```

### Count Users
```javascript
db.users.countDocuments()
```

### Find User by Email
```javascript
db.users.findOne({email: "vishwaspower5@gmail.com"})
```

### Find Users by Role
```javascript
db.users.find({role: "doctor"}).pretty()
db.users.find({role: "patient"}).pretty()
db.users.find({role: "admin"}).pretty()
```

### Find Unverified Users
```javascript
db.users.find({isEmailVerified: false}).pretty()
```

## User Management

### Update User Role
```javascript
db.users.updateOne(
  {email: "vishwaspower5@gmail.com"}, 
  {$set: {role: "doctor"}}
)
```

### Verify User Email
```javascript
db.users.updateOne(
  {email: "vishwaspower5@gmail.com"}, 
  {$set: {isEmailVerified: true}}
)
```

### Add Doctor Information
```javascript
db.users.updateOne(
  {email: "vishwaspower5@gmail.com"}, 
  {$set: {
    specialization: "General Practice",
    licenseNumber: "MD123456",
    experience: 5,
    consultationFee: 100
  }}
)
```

### Delete User
```javascript
db.users.deleteOne({email: "user@example.com"})
```

## Advanced Queries

### Users Created Today
```javascript
db.users.find({
  createdAt: {
    $gte: new Date(new Date().setHours(0,0,0,0))
  }
}).pretty()
```

### Users by Specialization
```javascript
db.users.find({specialization: "Cardiology"}).pretty()
```

### Export Data
```javascript
db.users.find({}, {password: 0, emailVerificationToken: 0}).pretty()
```

## Database Statistics
```javascript
db.stats()
db.users.stats()
```

## Backup Commands (Terminal)
```bash
# Export collection
mongoexport --db aidoc --collection users --out users_backup.json

# Import collection
mongoimport --db aidoc --collection users --file users_backup.json
``` 

## Quick Connection
```bash
mongosh aidoc
```

## Basic Queries

### View All Users
```javascript
db.users.find().pretty()
```

### Count Users
```javascript
db.users.countDocuments()
```

### Find User by Email
```javascript
db.users.findOne({email: "vishwaspower5@gmail.com"})
```

### Find Users by Role
```javascript
db.users.find({role: "doctor"}).pretty()
db.users.find({role: "patient"}).pretty()
db.users.find({role: "admin"}).pretty()
```

### Find Unverified Users
```javascript
db.users.find({isEmailVerified: false}).pretty()
```

## User Management

### Update User Role
```javascript
db.users.updateOne(
  {email: "vishwaspower5@gmail.com"}, 
  {$set: {role: "doctor"}}
)
```

### Verify User Email
```javascript
db.users.updateOne(
  {email: "vishwaspower5@gmail.com"}, 
  {$set: {isEmailVerified: true}}
)
```

### Add Doctor Information
```javascript
db.users.updateOne(
  {email: "vishwaspower5@gmail.com"}, 
  {$set: {
    specialization: "General Practice",
    licenseNumber: "MD123456",
    experience: 5,
    consultationFee: 100
  }}
)
```

### Delete User
```javascript
db.users.deleteOne({email: "user@example.com"})
```

## Advanced Queries

### Users Created Today
```javascript
db.users.find({
  createdAt: {
    $gte: new Date(new Date().setHours(0,0,0,0))
  }
}).pretty()
```

### Users by Specialization
```javascript
db.users.find({specialization: "Cardiology"}).pretty()
```

### Export Data
```javascript
db.users.find({}, {password: 0, emailVerificationToken: 0}).pretty()
```

## Database Statistics
```javascript
db.stats()
db.users.stats()
```

## Backup Commands (Terminal)
```bash
# Export collection
mongoexport --db aidoc --collection users --out users_backup.json

# Import collection
mongoimport --db aidoc --collection users --file users_backup.json
``` 