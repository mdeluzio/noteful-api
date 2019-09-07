const moment = require('moment');

function makeNotesArray() {
    return [
        {
            id: 1,
            name: 'Walk the dog',
            modified: '2019-09-06T15:53:52.844Z',
            folderid: 1,
            content: 'Walk for at least 20 minutes.'
        },
        {
            id: 2,
            name: 'Eggs',
            modified: '2019-09-06T15:53:52.844Z',
            folderid: 2,
            content: 'Two dozen.'
        },
        {
            id: 3,
            name: 'Phone Bill',
            modified: '2019-09-06T15:53:52.844Z',
            folderid: 3,
            content: '$100.00 due on the 15th.'
        },
        {
            id: 4,
            name: 'Doctor appointment',
            modified: '2019-09-06T15:53:52.844Z',
            folderid: 4,
            content: 'Annual check-up. Sept 7th at 11:00am'
        }
    ];
}

module.exports = { makeNotesArray };