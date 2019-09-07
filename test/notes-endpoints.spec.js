const knex = require('knex');
const app = require('../src/app');
const { makeFoldersArray, makeMaliciousFolder } = require('./folders.fixtures');
const { makeNotesArray } = require('./notes.fixtures');

describe(`Notes Endpoints`, () => {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        });
        app.set('db', db);
    })

    after('disconnect from db', () => db.destroy());

    before('clean the table', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'))

    afterEach('cleanup',() => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'))

    describe(`GET /api/notes`, () => {
        context(`Given no notes in database`, () => {
            
            it(`responds with 200 and an empty array`, () => {
                
                return supertest(app)
                .get(`/api/notes`)
                .expect(200, [])
            });
        });

        context(`Given there are notes in the database`, () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();

            beforeEach(`Insert test users`, () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            });

            it(`responds with 200 and all of the notes`, () => {

                return supertest(app)
                    .get(`/api/notes`)
                    .expect(200)
            });
        });
    });

    describe(`GET /api/notes/:note_id`, () => {

        context(`Given the note doesn't exist`, () => {
            
            it(`responds with 404 and an error message`, () => {
                const noteId = 123456;

                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(404, {
                        error: { message: `Note doesn't exist` }
                    })
            });
        });

        context(`Given the provided note does exist`, () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();

            beforeEach(`Insert test users`, () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            });

            it(`responds with 200 and the specified note`, () => {
                const noteId = 2;
                const expectedNote = testNotes[noteId - 1];

                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.id).to.eql(expectedNote.id)
                        expect(res.body.name).to.eql(expectedNote.name)
                        expect(res.body.content).to.eql(expectedNote.content)
                        expect(res.body.folderid).to.eql(expectedNote.folderid)
                    })
            });
        });
    });

    describe(`POST /api/notes`, () => {
        const testFolders = makeFoldersArray();

        beforeEach(`Insert test users`, () => {
            return db
                .into('noteful_folders')
                .insert(testFolders)
        });

        it(`creates a new note responding with 201 and the new note`, () => {
            const newNote = {
                name: 'Test Note',
                folderid: 1,
                content: 'Test Note Content'
            }; 

            return supertest(app)
                .post(`/api/notes`)
                .send(newNote)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newNote.name)
                    expect(res.body.content).to.eql(newNote.content)
                    expect(res.body.folderid).to.eql(newNote.folderid)
                    expect(res.body).to.have.property('id')
                    expect(res.body).to.have.property('modified')
                    expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                       .get(`/api/notes/${postRes.body.id}`)
                       .expect(postRes.body) 
                    )
        });

        const requiredFields = ['name', 'folderid']

        requiredFields.forEach(field => {
            const newNote = {
                name: 'Test new note',
                folderid: 2
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newNote[field]

                return supertest(app)
                    .post('/api/notes')
                    .send(newNote)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    })
            });
        });
    })

    describe(`DELETE /api/notess/:note_id`, () => {

        context(`Given no notes in the database`, () => {
            
            it(`responds with 404 and an error message`, () => {
                const idToRemove = 123456;

                return supertest(app)
                    .delete(`/api/notes/${idToRemove}`)
                    .expect(404, {
                        error: { message: `Note doesn't exist` }
                    })
            });
        });
        
        context(`Given there are notes in the database`, () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();

            beforeEach(`Insert test users`, () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            });

            it(`responds with 204 and removes the note`, () => {
                const idToRemove = 2;
                const expectedNotes = testNotes.filter(note => note.id !== idToRemove);

                return supertest(app)
                    .delete(`/api/notes/${idToRemove}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                        .get(`/api/notes`)
                        .then(() => {
                            expect(expectedNotes).to.have.lengthOf(testNotes.length - 1)
                        }) 
                    )
            });
        });

        context(`When a folder is deleted the notes related to the folder are also delted`, () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();

            beforeEach(`Insert test users`, () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            });

            it(`responds with 204 and deletes the folder and all notes related to the folder`, () => {
                const idToRemove = 2;
                const expectedFolders = testFolders.filter(folder => folder.id !== idToRemove);
                const expectedNotes = testNotes.filter(note => note.folderid !== idToRemove)
                
                return supertest(app)
                    .delete(`/api/folders/${idToRemove}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                        .get(`/api/folders`)
                        .expect(expectedFolders)
                    )
                    .then(() =>
                        supertest(app)
                        .get(`/api/notes`)
                        .expect(() => {
                            expect(expectedNotes).to.have.lengthOf(3);
                        })
                    )   
            });
        });
    })

    describe(`PATCH /api/notes/:note_id`, () => {

        context(`Given no notes in the database`, () => {

            it(`responds with 404 and an error message`, () => {
                const noteId = 123456;

                return supertest(app)
                    .patch(`/api/notes/${noteId}`)
                    .expect(404, {
                        error: { message: `Note doesn't exist` }
                    })
            });
        });

        context(`Given there are notes in the database`, () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();

            beforeEach(`Insert test users`, () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            });

            it(`responds with 204 and updates the note`, () => {
                const idToUpdate = 2;
                const updateNote = {
                    name: 'Updated Note Name',
                    content: 'Updated Note Content'
                };

                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updateNote
                };

                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send(updateNote)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                        .get(`/api/notes/${idToUpdate}`)
                        .expect(res => {
                            expect(res.body.id).to.eql(expectedNote.id)
                            expect(res.body.name).to.eql(expectedNote.name)
                            expect(res.body.content).to.eql(expectedNote.content)
                        })
                    )
            });

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2;

                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send({ notName: 'this is not name and should be ignored' })
                    .expect(400, {
                        error: { message: `Request must contain one of 'name' or 'content'.`}
                    })
            });

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2;
                const updateNote = {
                  name: 'updated note name'
                };
                const expectedNote = {
                  ...testNotes[idToUpdate - 1],
                  ...updateNote
                };
      
                return supertest(app)
                  .patch(`/api/notes/${idToUpdate}`)
                  .send({
                    ...updateNote,
                    fieldToIgnore: 'should not be in GET response'
                  })
                  .expect(204)
                  .then(res => 
                      supertest(app)
                      .get(`/api/notes/${idToUpdate}`)
                      .expect(res => {
                        expect(res.body.name).to.eql(expectedNote.name)
                        expect(res.body.content).to.eql(expectedNote.content)
                        expect(Object.entries(res.body).length).to.eql(Object.entries(expectedNote).length)
                      })
                    )
              });
        });
    })
})