function makeFoldersArray() {
    return [
        {
            id: 1,
            name: 'To-do'
        },
        {
            id: 2,
            name: 'Shopping List'
        },
        {
            id: 3,
            name: 'Bills to pay'
        },
        {
            id: 4,
            name: 'Upcoming Appointments'
        }
    ];
}

function makeMaliciousFolder() {
    const maliciousFolder = {
        id: 13,
        name: '<script>alert("xss");</script>'
    };

    const expectedFolder = {
        ...maliciousFolder,
        name: '&lt;script&gt;alert(\"xss\");&lt;/script&gt;'
    };

    return {
        maliciousFolder,
        expectedFolder
    }

}

module.exports = {
    makeFoldersArray,
    makeMaliciousFolder
};