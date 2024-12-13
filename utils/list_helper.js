var _ = require('lodash')

const dummy = (blogs) => {
	return 1
  }

const totalLikes = blogs => blogs.reduce(
	(sum, blog) => sum + blog.likes, 0);

const favoriteBlog = (blogs) => {
    const mostLikes = Math.max(...blogs.map(blog => blog.likes))
    const { title, author, likes } = blogs.find(blog => blog.likes === mostLikes)
    return { title, author, likes }
}

const mostBlogs = (blogs) => {
	const listOfAuthors = _.countBy(blogs, 'author');
	const newFormat = Object.entries(listOfAuthors).map(([name, value]) => ({
		author: name,
		blogs: value
	  }));
	const result = _.maxBy(newFormat, 'blogs');
	return result
}

const mostLikes = (blogs) => {
	const listOfAuthors = _.mapValues(
		_.groupBy(blogs, 'author'),
		(group) => _.sumBy(group, 'likes'))
	const newFormat = Object.entries(listOfAuthors).map(([name, value]) => ({
		author: name,
		likes: value
	  }));
	const result = _.maxBy(newFormat, 'likes');
	return result
}

  module.exports = {
	dummy,
	totalLikes,
	favoriteBlog,
	mostBlogs,
	mostLikes,
  }
