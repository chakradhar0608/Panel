import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'

export async function POST() {

  
  const publisher = await requirePublisher()
  if (!publisher) {

    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  

  const postback = await db.publisherPostback.findUnique({ where: { publisherId: publisher.id } })
  if (!postback?.postbackUrl) {

    return NextResponse.json({ error: 'NO_POSTBACK_URL', message: 'No postback URL configured' }, { status: 400 })
  }
  


  let url = postback.postbackUrl

  
  // Track all test replacements
  const testReplacements: Record<string, string> = {
    '{click_id}': 'TEST-CLICK-ID-12345',
    '{clickid}': 'TEST-CLICK-ID-12345',
    '{p1}': 'user_123',
    '{p2}': 'campaign_a',
    '{p3}': 'creative_7',
    '{p4}': 'placement_top',
    '{p5}': 'adset_42',
    '{payout}': '100.00',
    '{offer_id}': '1',
    '{offerid}': '1',
    '{event_name}': 'TestEvent',
    '{ip}': '1.2.3.4',
    '{tdate}': '2026-03-21 15:45:00',
    '{conversion_id}': '9999',
    '{googleaid}': 'test-google-aid'
  }
  
  // Apply all replacements
  url = url.replace(/{click_id}/g, testReplacements['{click_id}'])
  url = url.replace(/{clickid}/g, testReplacements['{clickid}'])
  url = url.replace(/{p1}/g, testReplacements['{p1}'])
  url = url.replace(/{p2}/g, testReplacements['{p2}'])
  url = url.replace(/{p3}/g, testReplacements['{p3}'])
  url = url.replace(/{p4}/g, testReplacements['{p4}'])
  url = url.replace(/{p5}/g, testReplacements['{p5}'])
  url = url.replace(/{payout}/g, testReplacements['{payout}'])
  url = url.replace(/{offer_id}/g, testReplacements['{offer_id}'])
  url = url.replace(/{offerid}/g, testReplacements['{offerid}'])
  url = url.replace(/{event_name}/g, testReplacements['{event_name}'])
  url = url.replace(/{ip}/g, testReplacements['{ip}'])
  url = url.replace(/{tdate}/g, testReplacements['{tdate}'])
  url = url.replace(/{conversion_id}/g, testReplacements['{conversion_id}'])
  url = url.replace(/{googleaid}/g, testReplacements['{googleaid}'])
  



  let success = false
  let statusCode: number | null = null
  let responseText = ''


  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    
    const response = await fetch(url, { method: 'GET', signal: controller.signal })
    clearTimeout(timeout)
    
    success = response.ok
    statusCode = response.status
    responseText = await response.text()


    await db.publisherPostback.update({
      where: { publisherId: publisher.id },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: `SUCCESS:${response.status}`,
      },
    })
    

  } catch (error) {
    const errorMessage = (error as Error).message
    responseText = errorMessage
    
    console.error('[PARTNER_POSTBACK_TEST_API] Test request failed:', {
      error: errorMessage,
      stack: (error as Error).stack,
      publisherId: publisher.id,
      testUrl: url
    })
    
    await db.publisherPostback.update({
      where: { publisherId: publisher.id },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: `FAILED:${responseText}`,
      },
    })
    

  }


  return NextResponse.json({ success, statusCode, response: responseText })
}
