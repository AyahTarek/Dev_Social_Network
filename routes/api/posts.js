const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const checkObjectId = require('../../middleware/checkObjectId');
const {check, validationResult} = require('express-validator');

const Post = require('../../models/Post');
const User = require('../../models/User');

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post('/',[auth, [
  check('text', 'Text is required')
  .not()
  .isEmpty()
    ]
  ],
  async (req, res)=> {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.status(400).json({errors: errors.array()});
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });

      await newPost.save();

      res.json(newPost);

    } catch (error) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }

});

// @route   GET api/posts
// @desc    Get all posts
// @access  Private
router.get('/', auth, async (req, res)=> {
  try {
    // Sort posts from most recent ones
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/posts/:post_id
// @desc    Get a post by its id
// @access  Private
router.get('/:post_id', auth, checkObjectId('post_id'), async (req, res)=> {
  try{
    // Find the post by its id
    const post = await Post.findById(req.params.post_id);

    if(!post) return res.status(404).json({msg: 'Post not found'});
    res.json(post);
  }catch(err){
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   Delete api/posts/:post_id
// @desc    Delete a post
// @access  Private
router.delete('/:post_id', auth,checkObjectId('post_id'), async(req, res)=> {
  try {
    // Find the post by its id
    const post = await Post.findById(req.params.post_id);

    if(!post) return res.status(404).json({msg: 'Post not found'});


    // Check that the auth user is owning the post intended to be deleted
    // req.user.id is the auth user from the token from the protected route
    // We need to change the ObjectID post.user type to match with the String req.user.id   
    if(post.user.toString() !== req.user.id){
      return res.status(401).json({msg: "User not authorized"});
    }

    await post.deleteOne();
    res.json({msg: 'Post Removed'});
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/:post_id
// @desc    Update a post
// @access  Private
router.put('/:post_id', [auth, checkObjectId('post_id'), [
  check('text', 'Text is required')
  .not()
  .isEmpty()
    ]], async(req, res)=>{
      try {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
          return res.status(400).json({errors: errors.array()});
        }
        const updatedPost = await Post.findByIdAndUpdate(
          req.params.post_id,
          {$set: {text: req.body.text}},
          {new: true}
          );
        if(!updatedPost) return res.status(404).json({msg: 'Post not found'});
        res.json(updatedPost);
        
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
});

// @route   PUT api/posts/like/:post_id
// @desc    Like a post
// @access  Private
router.put('/like/:post_id', auth, checkObjectId('post_id'), async(req, res)=>{
  try {
    const post = await Post.findById(req.params.post_id);

    // Check if the post has been already liked
    if(post.likes.some((like)=> like.user.toString() === req.user.id)){
      return res.status(400).json({msg: 'Post already liked'});
    }
    post.likes.unshift({user: req.user.id});

    await post.save();
    res.json(post.likes);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/unlike/:post_id
// @desc    Like a post
// @access  Private
router.put('/unlike/:post_id', auth, checkObjectId('post_id'), async(req, res)=>{
  try {
    const post = await Post.findById(req.params.post_id);

    // Check if the post has been already liked
    if(!post.likes.some((like)=> like.user.toString() === req.user.id)){
      // Post is not yet liked
      return res.status(400).json({msg: 'Post has not yet been liked'});
    }
    
    // Get the remove index
    const removeIndex = post.likes.map(like => like.user.toString()).indexOf(req.user.id);
    post.likes.splice(removeIndex, 1);
    await post.save();
    res.json(post.likes);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/posts/comment/:post_id
// @desc    Comment on a post
// @access  Private
router.post('/comment/:post_id',[auth, [
  check('text', 'Text is required')
  .not()
  .isEmpty()
    ]
  ],
  async (req, res)=> {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.status(400).json({errors: errors.array()});
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      const post = await Post.findById(req.params.post_id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      }
      post.comments.unshift(newComment)

      await post.save();

      res.json(post.comments);

    } catch (error) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }

});

// @route   Delete api/posts/comment/:post_id/:comment_id
// @desc    Comment on a post
// @access  Private
router.delete('/comment/:post_id/:comment_id', auth, checkObjectId('post_id'), checkObjectId('comment_id'), async(req, res)=> {
  try {
    // Get the post
    
    const post = await Post.findById(req.params.post_id);

    // Get the comment out of the post
    const comment = post.comments.find(comment => comment.id === req.params.comment_id);
    // Make sure post does exist
    if(!post){
      return res.status(404).json({msg: 'Post does not exist'});
    }

    // Make sure comment does exist
    if(!comment){
      return res.status(404).json({msg: 'Comment does not exist'});
    }

    // Make sure that the user deleting the comment is the one owning it
    if(comment.user.toString() !== req.user.id){
      return res.status(401).json({msg: 'User not authorized'});
    }
    
    post.comments = post.comments.filter(
      ({id}) => id !== req.params.comment_id
    );

    await post.save();
    return res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/comment/:post_id/:comment_id
// @desc    Edit comment on a post
// @access  Private
router.put('/comment/:post_id/:comment_id', auth, checkObjectId('post_id'), checkObjectId('comment_id'), [
  check('text', 'Text is required')
  .not()
  .isEmpty()
    ],async(req, res)=> {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.status(400).json({errors: errors.array()});
  }
  try {
    // Get the post
    const post = await Post.findById(req.params.post_id);

    // Get the comment out of the post
    const comment = post.comments.find(comment => comment.id === req.params.comment_id);

    // Make sure post does exist
    if(!post){
      return res.status(404).json({msg: 'Post does not exist'});
    }
    // Make sure comment do exist
    if(!comment){
      return res.status(404).json({msg: 'Comment does not exist'});
    }

    // Make sure that the user editting the comment is the one owning it
    if(comment.user.toString() !== req.user.id){
      return res.status(401).json({msg: 'User not authorized'});
    }
    comment.text = req.body.text;

    await post.save();

    res.json(post.comments);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

