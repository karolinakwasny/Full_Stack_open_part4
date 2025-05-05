const { test, after, beforeEach, describe } = require('node:test')
const mongoose = require('mongoose')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')

const api = supertest(app)
const bcrypt = require('bcrypt')
const Blog = require('../models/blog')
const User = require('../models/user')
const helper = require('./test_helper')
const jwt = require('jsonwebtoken')

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      username: 'tommi',
      name: 'Tom Lopez',
      password: 'tomspassword',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    assert(usernames.includes(newUser.username))
  })

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'maxi',
      name: 'Max Johnson',
      password: 'maxispassword',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const notValidUser = {
      username: 'maxi',
      name: 'Max Black',
      password: 'blackspassword',
    }

    const result = await api
      .post('/api/users')
      .send(notValidUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert(result.body.error.includes('expected `username` to be unique'))
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)
  })

  test('creation fails when no username is given', async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      name: 'John Moore',
      password: 'johnspassword',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert(result.body.error.includes('User validation failed: username: Path `username` is required.'))
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('creation fails when username is less than 3 characters long', async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      username: 'li',
      name: 'Li Moore',
      password: 'lispassword',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert(result.body.error.includes('Path `username` (`li`) is shorter than the minimum allowed length (3)'))
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('creation fails when no password is given', async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      username: 'johnny',
      name: 'John Moore',
    }

    const result =  await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert(result.body.error.includes('password is required and must be at least 3 characters long'))
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

  test('creation fails when password is less than 3 characters long', async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      username: 'limoore',
      name: 'Li Moore',
      password: 'li',
    }

    const result =  await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert(result.body.error.includes('password is required and must be at least 3 characters long'))
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

})

describe('when there are some blogs saved initially', () => {

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

    const allHaveId = response.body.every(blog => 'id' in blog)
    assert(allHaveId)
  })

  describe('addition of a new blog', () => {
    let token

    beforeEach(async () => {
      await Blog.deleteMany({})

      let user = await User.findOne({ username: 'testuser' })
      if (!user) {
        user = new User({
          username: 'testuser',
          name: 'Test User',
          password: 'testusersspassword'
        })
        await user.save()
      }

      const userForToken = {
        username: user.username,
        id: user.id,
      }
      token = jwt.sign(userForToken, process.env.SECRET)

      await Blog.insertMany(helper.initialBlogs)
    })


    test('a valid blog can be added with a valid token', async () => {
      const newBlog = {
        title: 'a valid title',
        author: 'Test User',
        url: 'www.avalidurl.com',
        likes: 0,
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

      const urls = blogsAtEnd.map(blog => blog.url)
      assert(urls.includes('www.avalidurl.com'))

    })

    test('blog without likes is added', async () => {
      const nolikesBlog = {
        title: 'a blog that nobody liked',
        author: 'Test User',
        url: 'www.myBlog.com/nolikes',
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(nolikesBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

      const likes = blogsAtEnd.map(blog => blog.likes)
      assert(likes.includes(0))
    })

    test('blog without title is not added', async () => {
      const newBlog = {
        author: 'Test User',
        url: 'www.myBlog.com/notitle',
        likes: 9,
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })


    test('blog without url is not added', async () => {
      const newBlog = {
        title: 'No url',
        author: 'Test User',
        likes: 0,
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })
  })
  test('a valid blog cannot be added without a token', async () => {
    const newBlog = {
      title: 'a valid title1',
      author: 'Test User1',
      url: 'www.avalidurl1.com',
      likes: 0,
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)
      .expect('Content-Type', /application\/json/)

  })
  describe('deletion of a blog', () => {
    let token
    beforeEach(async () => {

      let user = await User.findOne({ username: 'testdeleteuser' })
      if (!user) {
        user = new User({
          username: 'testdeleteuser',
          name: 'Test Delete',
          password: 'testdeleteusersspassword'
        })
        await user.save()
      }

      const userForToken = {
        username: user.username,
        id: user.id,
      }
      token = jwt.sign(userForToken, process.env.SECRET)

    })

    test('succeeds with status code 204 if id is valid', async () => {

      const newBlog = {
        title: 'Blog written by Test Delete',
        author: 'Test Delete',
        url: 'doesntmatter.com',
        likes: 0
      }
      const response = await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect('Content-Type', /application\/json/)

      const blogToDeleteId = response.body.id

      await api
        .delete(`/api/blogs/${blogToDeleteId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204)




    })
    test('if id is not valid, no blog gets deleted', async () => {
      const validNonexistingId = await helper.nonExistingId()

      await api
        .delete(`/api/blogs/${validNonexistingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })
  })
  describe('updating the information of an individual blog post', () => {
    test('updating likes', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToUpdate = blogsAtStart[1]
      const updatedBlog = { ...blogToUpdate, likes: 66 }

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
