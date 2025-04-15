const blogsRouter = require('express').Router()
const blog = require('../models/blog')
const Blog = require('../models/blog')
const User = require('../models/user')
const jwt = require('jsonwebtoken')


blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog
    .find({}).populate('user', { username: 1, name: 1 })

  response.json(blogs)
})

blogsRouter.post('/', async (request, response) => {
  const body = request.body
  if (!body.title || !body.url)
    return response.status(400).json({ error: 'title or url missing' })

  const user = request.user
  if (!user) {
    return response.status(400).json({ error: 'Invalid or missing userId' });
  }

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    user: user.id,
    likes: body.likes !== undefined ? body.likes : 0,
  })

  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()
  response.status(201).json(savedBlog)
})

blogsRouter.delete('/:id', async (request, response) => {
  const user = request.user
  if (!user) {
    return response.status(401).json({ error: 'invalid or missing token' })
  }

  const blog = await Blog.findById(request.params.id)
  if (!blog) {
    return response.status(404).send({ error: 'Blog not found' })
  }
  if (blog.user.toString() !== user.id.toString()){
    return response.status(403).send({ error: 'Only the creator can delete this blog' })
  }
  await Blog.findByIdAndDelete(request.params.id)

  response.status(204).end()
})

blogsRouter.put('/:id', async (request, response) => {
  const { title, author, url, likes } = request.body

  const blog = await Blog.findByIdAndUpdate(
    request.params.id,
    { title, author, url, likes },
    { new: true }
  )

  response.status(200).json(blog)
})

module.exports = blogsRouter
