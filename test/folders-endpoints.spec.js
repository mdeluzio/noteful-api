const knex = require('knex');
const app = require('../src/app');
const { makeFoldersArray, makeMaliciousFolder } = require('./folders.fixtures');

describe(`Folders Endpoints`, () => {
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

    describe(`GET /api/folders`, () => {

        context(`Given there are no folders in the database`, () => {
            
            it(`responds with 200 and an empty array`, () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, [])
            });
        });
        
        context(`Given there are folders in the database`, () => {
            const testFolders = makeFoldersArray();

            beforeEach(`insert folders`, () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            });

            it(`responds with 200 and all of the folders`, () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, testFolders)
            });
        });

        context(`Given and XSS attack folder`, () => {
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

            beforeEach(`insert malicious folder`, () => {
                return db
                    .into('noteful_folders')
                    .insert(maliciousFolder)
            });

            it(`removes XSS attack content`, () => {
                return supertest(app)
                    .get(`/api/folders`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].name).to.eql(expectedFolder.name)
                    })
            });
        });
    })

    describe(`GET /api/folders/:folder_id`, () => {
        
        context(`Given the provided folder does not exist`, () => {

            it(`responds with 404 and an error message`, () => {
                const folderId = 123456;

                return supertest(app)
                .get(`/api/folders/${folderId}`)
                .expect(404, { error: { message: `Folder doesn't exist` } })
            });
        });

        context(`Given the provided folder does exist`, () => {
            const testFolders = makeFoldersArray();

            beforeEach(`insert folders`, () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
            });

            it(`responds with 200 and the specified folder`, () => {
                const folderId = 2;
                const expectedFolder = testFolders[folderId - 1];

                return supertest(app)
                    .get(`/api/folders/${folderId}`)
                    .expect(200, expectedFolder)
            });
        });

        context(`Given and XSS attack folder`, () => {
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

            beforeEach(`insert malicious folder`, () => {
                return db
                    .into('noteful_folders')
                    .insert(maliciousFolder)
            });

            it(`removes XSS attack content`, () => {
                return supertest(app)
                    .get(`/api/folders/${maliciousFolder.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.name).to.eql(expectedFolder.name)
                    })
            })
        });
    })

    describe(`POST /api/folders`, () => {

        it(`creates a new folder responding with 201 and the new folder`, () => {
            const newFolder = {
                name: 'Test Folder'
            }; 

            return supertest(app)
                .post(`/api/folders`)
                .send(newFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newFolder.name)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                       .get(`/api/folders/${postRes.body.id}`)
                       .expect(postRes.body) 
                    )
        });

        it(`responds with 400 and an error message when 'name' is missing`, () => {

            return supertest(app)
                .post(`/api/folders`)
                .send({})
                .expect(400, {
                    error: { message: `Missing 'name' in request body` }
                })
        });

        it(`removes XSS attack content from response`, () => {
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

            return supertest(app)
                .post(`/api/folders`)
                .send(maliciousFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(expectedFolder.name)
                })
        });
    })


})