/*
 * Copyright (C) 2013 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import AssignmentGroup from '@canvas/assignments/backbone/models/AssignmentGroup.coffee'
import Assignment from '@canvas/assignments/backbone/models/Assignment.coffee'
import AssignmentGroupCollection from '@canvas/assignments/backbone/collections/AssignmentGroupCollection'
import Course from '@canvas/courses/backbone/models/Course.coffee'
import fakeENV from 'helpers/fakeENV'
import {saveObservedId} from '@canvas/observer-picker/ObserverGetObservee'

const COURSE_SUBMISSIONS_URL = '/courses/1/submissions'

QUnit.module('AssignmentGroupCollection', {
  setup() {
    fakeENV.setup()
    this.server = sinon.fakeServer.create()
    this.assignments = [1, 2, 3, 4].map(id => new Assignment({id}))
    this.group = new AssignmentGroup({assignments: this.assignments})
    this.collection = new AssignmentGroupCollection([this.group], {
      courseSubmissionsURL: COURSE_SUBMISSIONS_URL,
    })
  },
  teardown() {
    fakeENV.teardown()
    this.server.restore()
  },
})

test('::model is AssignmentGroup', () =>
  strictEqual(AssignmentGroupCollection.prototype.model, AssignmentGroup))

test('default params include assignments and not discussion topics', () => {
  const {include} = AssignmentGroupCollection.prototype.defaults.params
  deepEqual(include, ['assignments'], 'include only contains assignments')
})

test('optionProperties', () => {
  const course = new Course()
  const collection = new AssignmentGroupCollection([], {
    course,
    courseSubmissionsURL: COURSE_SUBMISSIONS_URL,
  })
  strictEqual(
    collection.courseSubmissionsURL,
    COURSE_SUBMISSIONS_URL,
    'assigns courseSubmissionsURL to this.courseSubmissionsURL'
  )
  strictEqual(collection.course, course, 'assigns course to this.course')
})

test('(#getGrades) loading grades from the server', function () {
  ENV.observed_student_ids = []
  ENV.PERMISSIONS.read_grades = true
  let triggeredChangeForAssignmentWithoutSubmission = false
  const submissions = [1, 2, 3].map(id => ({
    id,
    assignment_id: id,
    grade: id,
  }))
  this.server.respondWith('GET', `${COURSE_SUBMISSIONS_URL}?per_page=50`, [
    200,
    {'Content-Type': 'application/json'},
    JSON.stringify(submissions),
  ])
  const lastAssignment = this.assignments[3]
  lastAssignment.on(
    'change:submission',
    () => (triggeredChangeForAssignmentWithoutSubmission = true)
  )
  this.collection.getGrades()
  this.server.respond()
  for (const assignment of this.assignments) {
    if (assignment.get('id') === 4) continue
    equal(
      assignment.get('submission').get('grade'),
      assignment.get('id'),
      'sets submission grade for assignments with a matching submission'
    )
  }
  ok(
    triggeredChangeForAssignmentWithoutSubmission,
    'triggers change for assignments without a matching submission grade so the UI can update'
  )
})

test('(#getObservedUserId) when observing a single student', function () {
  const expected_user_id = 2012
  const all_user_ids = [expected_user_id]
  ENV.observed_student_ids = all_user_ids
  ENV.FEATURES = {observer_picker: false}

  const actual_user_id = this.collection.getObservedUserId()

  equal(expected_user_id, actual_user_id, 'returns observed user id')
})

// This tests that we fall back to prior behavior when observer_picker not enabled
test('(#getObservedUserId) when observing multiple students', function () {
  const all_user_ids = [123, 456, 789]
  ENV.observed_student_ids = all_user_ids // should not use any of these since multiple are present
  ENV.FEATURES = {observer_picker: false}

  const actual_user_id = this.collection.getObservedUserId()

  equal(!!actual_user_id, false, 'returns falsey')
})

test('(#getObservedUserId) when observing a student with observer_picker enabled', function () {
  const expected_user_id = 2012
  const current_user_id = 1999
  ENV.current_user = {id: current_user_id}
  ENV.observed_student_ids = [123, 456, 789] // should be ignored
  ENV.FEATURES = {observer_picker: true}
  saveObservedId(current_user_id, expected_user_id) // should be used

  const actual_user_id = this.collection.getObservedUserId()

  equal(expected_user_id, actual_user_id, 'returns the selected observed user id')
})

test('(#getObservedUserId) when not observing a student', function () {
  ENV.observed_student_ids = []
  ENV.FEATURES = {observer_picker: false}

  const actual_user_id = this.collection.getObservedUserId()

  equal(!!actual_user_id, false, 'returns falsey')
})

test('(#getObservedUserId) when not observing a student with observer_picker enabled', function () {
  ENV.observed_student_ids = []
  ENV.FEATURES = {observer_picker: true}

  const actual_user_id = this.collection.getObservedUserId()

  equal(!!actual_user_id, false, 'returns falsey')
})
