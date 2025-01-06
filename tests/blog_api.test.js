const { test, after, beforeEach } = require('node:test')
const mongoose = require('mongoose')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')

const api = supertest(app)
const Blog = require('../models/blog')
const helper = require('./test_helper')

beforeEach(async () => {
	await Blog.deleteMany({})

	await Blog.insertMany(helper.initialBlogs)
  })

test('blogs are returned as json', async () => {
  await api
	.get('/api/blogs')
	.expect(200)
	.expect('Content-Type', /application\/json/)
})

test('there are 4 blogs', async () => {
	const response = await api.get('/api/blogs')

	assert.strictEqual(response.body.length, 4)
})

test('unique identifier property of the blog posts is named id', async () => {
	const response = await api.get('/api/blogs')

	const allHaveId = response.body.every(blog => blog.hasOwnProperty("id"))
	assert(allHaveId)
})

test('a valid blog can be added', async () => {
	const newBlog = {
		title: 'a valid title',
		author: 'a valid author',
		url: 'www.avalidurl.com',
		likes: 0,
	}

	await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

	const blogsAtEnd = await helper.blogsInDb()
	assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

	const urls = blogsAtEnd.map(blog => blog.url)
	assert(urls.includes('www.avalidurl.com'))

})

test('blog without likes is not added', async () => {
	const newBlog = {
		title: 'a blog that nobody liked',
		author: 'anonymous',
		url: 'www.myBlog.com/nolikes',
	}

	await api
	  .post('/api/blogs')
	  .send(newBlog)
	  .expect(201)
	  .expect('Content-Type', /application\/json/)

	const blogsAtEnd = await helper.blogsInDb()
	assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

	const likes = blogsAtEnd.map(blog => blog.likes)
	assert(likes.includes(0))
  })

after(async () => {
  await mongoose.connection.close()
})
