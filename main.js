// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      2024-11-07
// @description  try to take over the world!
// @author       You
// @match        https://inbar.biu.ac.il/Live/CreateStudentWeeklySchedule.aspx
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM_notification
// ==/UserScript==

(function() {

    const rows = Array.from(document.querySelectorAll('#ContentPlaceHolder1_gvLinkToLessons > tbody > tr'));
    // put lectures and tirguls
    var target_id = ['893311-01', '893311-03','893311-04'];
    // var target_id = ['895656-01', '895656-02'];
    // boolean values based on availability
    var target_val = new Array(target_id.length).fill(0);
    var target_lectures_mask = new Array(target_id.length).fill(0);
    // we need this to understand what tirgul to choose at the second page
    var id_to_index = new Array(target_id.length).fill(0);
    var found = 0;

    function notifyUser(message) {
        GM_notification({
            title: 'Course Availability Alert',
            text: message,
            timeout: 0, // Notification stays until dismissed
            silent: false, // Play system notification sound
            onclick: function() {
                window.focus();
            }
        });
    }

    function get_info () {

        console.log('/////////////////////// COURSES INFO ////////////////////////');

        rows.forEach(function(row) {
            var courseName = '';
            var availability = '';
            var courseType = '';
            var courseId = row.innerText.split('\n')[2];
            if (courseId === undefined) return;
            courseId = courseId.trim();

            // Get the course name
            var courseNameCell = row.querySelector('td.NoPadding span');
            if (courseNameCell) {
                // The course name is within a nested table
                var courseNameTable = courseNameCell.querySelector('table');
                if (courseNameTable) {
                    var courseNameTd = courseNameTable.querySelector('td');
                    if (courseNameTd) {
                        courseName = courseNameTd.textContent.trim();
                    }
                }
            }

            // Get the availability value
            var hiddenInput = row.querySelector('input.GraphicalCheckBoxInput[type="hidden"]');
            if (hiddenInput) {
                var value = hiddenInput.value;
                if (value === '0') {
                    availability = 'Full    ';
                } else if (value === '1') {
                    availability = 'Not Full';
                } else {
                    return;
                }
            } else {
                return;
            }

            // Get the course type
            var courseTypeSpan = row.querySelector('span[id^="ContentPlaceHolder1_gvLinkToLessons_lblLessonType_"]');
            if (courseTypeSpan) {
                courseType = courseTypeSpan.textContent.trim();
            }

            // Build the output string
            var output = courseName + ': ' + availability;
            if (courseType === 'תרגיל') {
                output += ' | Tirgul ';
            } else {
                output += ' | Lecture';
            }
            output += ' | Course ID: ' + courseId;

            const target_index = target_id.indexOf(courseId);
            if (target_index >= 0) {
                // will be 0 if we were successful enrolling because we won't find it in the list
                found = 1;
                // set the mask to know which are lectures
                target_lectures_mask[target_index] = (courseType === 'הרצאה');
                // set the bits to know which are full
                target_val[target_index] = (availability === 'Not Full');
            }
            console.log(output);
        });

        console.log(target_id);
        console.log(target_val);
        console.log(target_lectures_mask);
    }

    function enroll (lecture_index, tirgul_index) {

        // lets save the indices because refresh is gonna wipe everything
        localStorage.setItem('i', lecture_index);
        localStorage.setItem('j', tirgul_index);

        // click on the pen to enroll
        var pen = document.getElementById('ContentPlaceHolder1_gvLinkToLessons_btnLinkStudentToLesson_' + lecture_index);
        // preset the confirmation popup
        window.confirm = function () { return true; }

        if (pen) {
            localStorage.setItem('enroll_attempted', 'true');
            pen.click();
        } else {
            localStorage.setItem('enroll_attempted', 'false');
            console.log('pen not found');
        }
        // MAKE SOUND ON DISCORD
    }

    if (localStorage.getItem('quit') === 'true') {

        // wait for enrollment to process
        setTimeout(() => {

            localStorage.setItem('enroll_attempted', 'false');
            localStorage.setItem('quit', 'false');

            // preset the confirmation popup
            window.confirm = function () { return true; }

            // go back to checking availability
            document.getElementById('ContentPlaceHolder1_ucMandatoryAdditionalLessonsSelection_btnCancel').click();
        }, 1000);

        return;
    }

    // if already clicked on the pen, if on choose tirgul page
    if (localStorage.getItem('enroll_attempted') === 'true') {

        // get the row
        var rows2 = Array.from(document.querySelectorAll('#ContentPlaceHolder1_ucMandatoryAdditionalLessonsSelection_gvLessonsGroup1 > tbody > tr'));
        // get the tirgul id we want to try and enroll to
        var target_id2 = target_id[localStorage.getItem('j')-'0'];
        // select tirgul via radio button of target
        rows2.forEach((a) => { if (a.innerText.split('\n')[0].split('\t')[3] === target_id2) a.querySelectorAll('input[type=radio]')[0].click(); })

        // after this well try to go back a menu
        localStorage.setItem('quit', 'true');
        // click on submit
        document.getElementById('ContentPlaceHolder1_ucMandatoryAdditionalLessonsSelection_btnAssign').click();

        return;
    }

    // 1 second per enrollment attempt
    setTimeout(() => {

        console.log('hello navi!');
        get_info();
        // if the course id was not found in the list
        if (found == 0) { console.log('enrolled successfully!'); notifyUser('course is now available!'); return; }

        // try all the combinations of (lecture, tirgul)

        // don't overwrite previous refresh values
        if (localStorage.getItem('i') === null && localStorage.getItem('i') === null) {
            localStorage.setItem('i', '0');
            localStorage.setItem('j', '0');
        }

        for (let i=localStorage.getItem('i'); i < target_id.length; i++) {
            if (target_lectures_mask[i] === true && target_val[i] === true) {
                for (let j=localStorage.getItem('j'); j < target_id.length; j++) {
                    if (target_lectures_mask[j] === false && target_val[j] === true) {
                        enroll(i, j);
                    }
                }
            }
        }

        localStorage.removeItem('i');
        localStorage.removeItem('j');

        location.reload();

    }, 2000);

})();
