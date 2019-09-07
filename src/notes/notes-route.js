const express = require('express');
const xss = require('xss');
const NotesService = require('./notes-service');


const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
    id: note.id,
    name: xss(note.name),
    modified: new Date(note.modified),
    folderid: note.folderid,
    content: xss(note.content)
})


notesRouter
    .route('/')
    .get((req, res, next) => {
        NotesService.getAllNotes(req.app.get('db'))
        .then(notes => {
            res.json(notes.map(serializeNote))
        })
        .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { name, content, folderid } = req.body;
        const newNote = {
            name,
            folderid
        };

        for(const [key, value] of Object.entries(newNote)) {
            if(value == null) {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body`}
                })
            };
        };

        newNote.content = content;

        NotesService.insertNote(
            req.app.get('db'),
            newNote
        )
        .then(note => {
            res
                .status(201)
                .location(`/api/notes/${note.id}`)
                .json(serializeNote(note))
        })
        .catch(next)
    })

 notesRouter
    .route('/:note_id')
    .all((req, res, next) => {
        NotesService.getById(
            req.app.get('db'),
            req.params.note_id
        )
        .then(note => {
            if(!note) {
                return res.status(404).json({
                    error: { message: `Note doesn't exist` }
                    });
            };
            res.note = note;
            next();
        })
        .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeNote(res.note))
    })
    .delete((req, res, next) => {
        NotesService.deleteNote(
            req.app.get('db'),
            req.params.note_id
        )
        .then(() => {
            res.status(204).end()
        })
    })
    .patch(jsonParser, (req, res, next) => {
        const { name, content } = req.body;
        const updateNote = { name, content };

        const numberOfValues = Object.values(updateNote).filter(Boolean).length;
        if(numberOfValues === 0) {
            return res.status(400).json({
                error: { message: `Request must contain one of 'name' or 'content'.`}
            })
        }

        updateNote.modified = new Date();

        NotesService.updateNote(
            req.app.get('db'),
            req.params.note_id,
            updateNote
        )
        .then(() => {
            res.status(204).end()
        })
    })

module.exports = notesRouter;