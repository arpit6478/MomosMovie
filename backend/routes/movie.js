const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all movies
router.get('/movies', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('movies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch movies'
        });
    }
});

// GET single movie by ID
router.get('/movie/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('movies')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Movie not found'
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching movie:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch movie'
        });
    }
});

// POST add new movie
router.post('/add-movie', async (req, res) => {
    try {
        const {
            title,
            poster,
            description,
            category,
            quality,
            size,
            link
        } = req.body;

        // Validate required fields
        if (!title || !poster || !description || !category || !quality || !size || !link) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        const { data, error } = await supabase
            .from('movies')
            .insert([
                {
                    title,
                    poster,
                    description,
                    category,
                    quality,
                    size,
                    link,
                    created_at: new Date()
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data,
            message: 'Movie added successfully'
        });
    } catch (error) {
        console.error('Error adding movie:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add movie'
        });
    }
});

// DELETE movie
router.delete('/movie/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('movies')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Movie deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting movie:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete movie'
        });
    }
});

module.exports = router;
