const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa)
  });
}
const db = admin.firestore();

async function run() {
  const roomsSnap = await db.collection('rooms').get();
  console.log('Total rooms:', roomsSnap.size);
  for (const doc of roomsSnap.docs) {
    console.log('Room ID:', doc.id, 'Host:', doc.data().hostName, 'status:', doc.data().status);
    const parts = await db.collection('rooms').doc(doc.id).collection('participants').get();
    console.log('  Participants:');
    parts.docs.forEach(p => console.log('   -', p.id, p.data().displayName, 'cameraOff:', p.data().isCameraOff, 'muted:', p.data().isMuted));
    
    const signals = await db.collection('rooms').doc(doc.id).collection('signals').get();
    console.log('  Signals:');
    for (const s of signals.docs) {
      const data = s.data();
      console.log('   - pair:', s.id, 'offerFrom:', data.offer?.from, 'offerId:', data.offer?.id, 'answerFrom:', data.answer?.from, 'answerOfferId:', data.answer?.offerId);
      if (data.offer?.sdp) {
        const videoLines = data.offer.sdp.split('\r\n').filter(l => l.includes('m=video') || l.includes('sendrecv') || l.includes('sendonly') || l.includes('recvonly'));
        console.log('     Offer video lines:', videoLines);
      }
      if (data.answer?.sdp) {
        const videoLines = data.answer.sdp.split('\r\n').filter(l => l.includes('m=video') || l.includes('sendrecv') || l.includes('sendonly') || l.includes('recvonly'));
        console.log('     Answer video lines:', videoLines);
      }
      const cands = await s.ref.collection('candidates').get();
      console.log('     Candidates count:', cands.size);
    }
  }
}

run().catch(console.error);
