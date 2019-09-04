CREATE TABLE noteful_notes (
    id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    name TEXT NOT NULL,
    modified TIMESTAMP DEFAULT now(),
    folderId INTEGER REFERENCES noteful_folders(id) ON DELETE CASCADE NOT NULL,
    content TEXT
);