const blogsRouter = require('express').Router()
// const Blog = require('../models/blog')
const mongoose = require('mongoose')
const config = require('../utils/config')

const blogSchema = new mongoose.Schema({
  title: String,
  author: String,
  url: String,
  likes: Number
})

const Blog = mongoose.model('Blog', blogSchema)

mongoose.connect(config.MONGODB_URI)

blogsRouter.get('/', (request, response) => {
	Blog
	  .find({})
	  .then(blogs => {
		response.json(blogs)
	  })
  })

blogsRouter.post('/', (request, response) => {
	const blog = new Blog(request.body)

	blog
	  .save()
	  .then(result => {
		response.status(201).json(result)
	  })
  })

module.exports = blogsRouter
