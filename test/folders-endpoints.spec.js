const knex = require('knex');
const app = require('../src/app');
const { makeFoldersArray } = require('./folders.fixtures');

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

    describe(`GET /folders`, () => {

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
    })

    describe(`GET /folders/:folder_id`, () => {
        
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
    })

    
})