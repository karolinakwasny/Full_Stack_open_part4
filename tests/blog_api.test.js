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
	assert.ok(allHaveId)
})

after(async () => {
  await mongoose.connection.close()
})
