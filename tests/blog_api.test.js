const { test, after, beforeEach, describe } = require('node:test')
const mongoose = require('mongoose')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')

const api = supertest(app)
const Blog = require('../models/blog')
const helper = require('./test_helper')

describe('when there are some blogs saved initially', () =>{
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

	describe('addition of a new blog', () => {
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

		test('blog without likes is added', async () => {
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

		test('blog without title is not added', async () => {
			const newBlog = {
				author: 'Tom Lopez',
				url: 'www.myBlog.com/notitle',
				likes: 9,
			}

			await api
			  .post('/api/blogs')
			  .send(newBlog)
			  .expect(400)

			const blogsAtEnd = await helper.blogsInDb()
			assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
		  })

		test('blog without url is not added', async () => {
			const newBlog = {
				title: 'No url',
				author: 'John Moore',
				likes: 0,
			}

			await api
			  .post('/api/blogs')
			  .send(newBlog)
			  .expect(400)

			const blogsAtEnd = await helper.blogsInDb()
			assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
		  })
		})
	describe('deletion of a blog', () => {
		test('succeeds with status code 204 if id is valid', async () => {
			const blogsAtStart = await helper.blogsInDb()
			const blogToDelete = blogsAtStart[1]

			await api
				.delete(`/api/blogs/${blogToDelete.id}`)
				.expect(204)

			const blogsAtEnd = await helper.blogsInDb()

			assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)

			const titles = blogsAtEnd.map(blog => blog.title)
			assert(!titles.includes(blogToDelete.title))
		})
		test('if id is not valid, no blog gets deleted', async () => {
			const validNonexistingId = await helper.nonExistingId()

			await api
			.delete(`/api/blogs/${validNonexistingId}`)
			.expect(404)

			const blogsAtEnd = await helper.blogsInDb();
			assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length);
		})
	})
	describe('updating the information of an individual blog post', () => {
		test('updating likes', async ()=> {
			const blogsAtStart = await helper.blogsInDb()
			const blogToUpdate = blogsAtStart[1]
			const updatedBlog = { ...blogToUpdate, likes: 66}

			await api
			  .put(`/api/blogs/${blogToUpdate.id}`)
			  .send(updatedBlog)
			  .expect(200)
			  .expect('Content-Type', /application\/json/)

			const blogsAtEnd = await helper.blogsInDb()
			assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

			assert.strictEqual(blogsAtEnd[1].likes, 66)
		})
	})
})

after(async () => {
  await mongoose.connection.close()
})
