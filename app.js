const config = require('./utils/config')
const express = require('express')
const app = express()
const cors = require('cors')
const blogsRouter = require('./controllers/blogs')
// const middleware = require('./utils/middleware')
// const logger = require('./utils/logger')


app.use(cors())
app.use(express.json())

app.use('/api/blogs', blogsRouter)

module.exports = app
