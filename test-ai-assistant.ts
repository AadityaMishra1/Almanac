/**
 * Test script for AI Assistant functions
 * Run with: npx ts-node test-ai-assistant.ts
 */

import { createEvent, searchEvents, analyzeSchedule } from './lib/ai-assistant'

async function testCreateEventWithoutCourse() {
  console.log('\n=== Test 1: Create Event Without Course ===')
  try {
    const result = await createEvent('test-user-id', {
      title: 'Poker Club Meeting',
      type: 'Meeting',
      startDate: '2025-12-26T20:00:00',
      endDate: '2025-12-26T22:00:00',
      description: 'Weekly poker club meeting',
      recurring: 'weekly',
      recurrenceCount: 8
    })
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function testCreateEventWithCourse() {
  console.log('\n=== Test 2: Create Event With Course ===')
  try {
    const result = await createEvent('test-user-id', {
      title: 'Study Session',
      type: 'Study Session',
      courseId: 'test-course-id',
      startDate: '2025-12-27T14:00:00',
      endDate: '2025-12-27T16:00:00',
      description: 'Physics exam prep'
    })
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function testSearchEvents() {
  console.log('\n=== Test 3: Search Events ===')
  try {
    const result = await searchEvents('test-user-id', {
      query: 'poker',
      limit: 10
    })
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function testAnalyzeSchedule() {
  console.log('\n=== Test 4: Analyze Schedule ===')
  try {
    const result = await analyzeSchedule('test-user-id', {
      analysisType: 'busiest_day',
      dateRange: {
        start: '2025-12-21',
        end: '2025-12-28'
      }
    })
    console.log('✅ Result:', result)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function runTests() {
  console.log('🧪 Starting AI Assistant Tests...')
  console.log('Note: These tests use dummy user IDs and will not persist to database')
  console.log('For full integration testing, use the UI chat interface')

  await testCreateEventWithoutCourse()
  await testCreateEventWithCourse()
  await testSearchEvents()
  await testAnalyzeSchedule()

  console.log('\n✨ Tests complete!')
}

runTests().catch(console.error)
