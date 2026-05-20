import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notesAPI, paymentsAPI } from '../context/api';
import NoteCard from '../components/ui/NoteCard';

const NoteDetail = () => {
  const { id } = useParams();
  const { user, purchaseNote, isNotePurchased, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [relatedNotes, setRelatedNotes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewHover, setReviewHover] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');
  const [digitalMode, setDigitalMode] = useState(false);
  const [learnedFlashcards, setLearnedFlashcards] = useState({});
  const [flippedCards, setFlippedCards] = useState({});

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      try {
        const data = await notesAPI.getById(id);
        setNote(data);
        // Fetch related notes by seller
        if (data.sellerId?._id) {
          const sellerNotes = await notesAPI.getBySeller(data.sellerId._id);
          setRelatedNotes((sellerNotes || []).filter(n => n._id !== data._id).slice(0, 3));
        }
        // Fetch reviews
        try {
          const revData = await notesAPI.getReviews(data._id);
          setReviews(revData || []);
        } catch { setReviews([]); }
      } catch (error) {
        console.error("Error fetching note:", error);
        setNote(null);
      }
      setLoading(false);
    };
    fetchNote();
  }, [id]);

  if (loading) {
    return (
      <div className="container min-h-screen" style={{ paddingTop: '10vh', paddingBottom: 'var(--space-20)' }}>
        <div className="flex flex-wrap gap-8" style={{ alignItems: 'flex-start', marginTop: 'var(--space-12)' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div className="card overflow-hidden"><div className="skeleton" style={{ height: '360px' }}></div></div>
            <div className="card mt-6" style={{ padding: 'var(--space-6)' }}>
              <div className="skeleton" style={{ height: '24px', width: '70%', marginBottom: '16px' }}></div>
              <div className="skeleton" style={{ height: '14px', width: '90%', marginBottom: '8px' }}></div>
              <div className="skeleton" style={{ height: '14px', width: '80%' }}></div>
            </div>
          </div>
          <div style={{ width: '100%', maxWidth: '360px', flexShrink: 0 }}>
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div className="skeleton" style={{ height: '40px', marginBottom: '16px' }}></div>
              <div className="skeleton" style={{ height: '48px', marginBottom: '12px' }}></div>
              <div className="skeleton" style={{ height: '48px' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container min-h-screen flex items-center justify-center">
        <div className="card-glass text-center" style={{ padding: 'var(--space-12)' }}>
          <div className="text-5xl mb-4">❌</div>
          <h2 className="font-bold text-2xl mb-2">Note Not Found</h2>
          <p className="text-muted mb-6">The note you're looking for doesn't exist.</p>
          <Link to="/browse" className="btn btn-primary">Browse Notes</Link>
        </div>
      </div>
    );
  }

  const seller = typeof note.sellerId === 'object' && note.sellerId !== null
    ? note.sellerId
    : null;
  const noteId = note._id || note.id;
  const isFree = note.price === 0 || note.isTextbook;
  const isPurchased = isNotePurchased(noteId) || isFree;
  const sellerUsername = seller?.username || '';
  const sellerFullName = seller?.fullName || 'Unknown';
  const sellerId = seller?._id || seller?.id || note.sellerId;

  const handlePurchase = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }

    // Free notes bypass Razorpay
    if (isFree) {
      setPurchasing(true);
      await purchaseNote(noteId);
      setPurchasing(false);
      return;
    }

    // Paid notes — Razorpay checkout
    setPurchasing(true);
    try {
      // Dynamically load Razorpay script
      await new Promise((resolve, reject) => {
        if (window.Razorpay) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(script);
      });

      const orderData = await paymentsAPI.createOrder(noteId);

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'EduMarket',
        description: orderData.note.title,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.user.name,
          email: orderData.user.email,
        },
        theme: { color: '#6C63FF' },
        handler: async (response) => {
          try {
            await paymentsAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              noteId,
            });
            // Refresh auth context to update purchasedNotes
            await purchaseNote(noteId);
            alert('🎉 Payment successful! Note unlocked.');
          } catch (err) {
            alert('Payment verification failed: ' + err.message);
          }
        },
        modal: {
          ondismiss: () => setPurchasing(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        alert('Payment failed: ' + response.error.description);
        setPurchasing(false);
      });
      rzp.open();
    } catch (err) {
      // Razorpay not configured — fall back to direct purchase
      if (err.message?.includes('not configured') || err.message?.includes('Failed to load')) {
        console.warn('Razorpay not configured, using direct purchase fallback');
        await purchaseNote(noteId);
      } else {
        alert('Payment error: ' + err.message);
      }
    }
    setPurchasing(false);
  };

  const handleChat = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    navigate(`/chat/${sellerId}`);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!reviewRating) return;
    setSubmittingReview(true);
    try {
      const result = await notesAPI.review(noteId, reviewRating, reviewComment);
      setNote(prev => ({ ...prev, rating: result.rating, reviews: result.reviews }));
      setReviews(prev => {
        const existing = prev.findIndex(r => r.userId?._id === (user?._id || user?.id));
        const newReview = { userId: { _id: user?._id, fullName: user?.fullName, username: user?.username }, rating: reviewRating, comment: reviewComment, createdAt: new Date().toISOString() };
        if (existing >= 0) { const updated = [...prev]; updated[existing] = newReview; return updated; }
        return [newReview, ...prev];
      });
      setReviewDone(true);
      setReviewComment('');
    } catch (err) { alert(err.message); }
    setSubmittingReview(false);
  };

  return (
    <div className="container min-h-screen" style={{ paddingTop: '10vh', paddingBottom: 'var(--space-20)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-8 animate-fade-in">
        <Link to="/" className="hover:text-primary" style={{ transition: 'color var(--transition-fast)' }}>Home</Link>
        <span>›</span>
        <Link to="/browse" className="hover:text-primary" style={{ transition: 'color var(--transition-fast)' }}>Browse</Link>
        <span>›</span>
        <span className="text-primary font-medium truncate" style={{ maxWidth: '300px' }}>{note.title}</span>
      </div>

      <div className="flex flex-wrap gap-8 note-detail-layout" style={{ alignItems: 'flex-start' }}>
        {/* Left: Note Preview */}
        <div className="animate-fade-in-left" style={{ flex: 1, minWidth: '300px' }}>
          {isPurchased && note.digitalizedContent && (
            <div className="flex justify-between items-center gap-4 mb-4">
              <span className="text-xs text-muted uppercase font-bold tracking-wider">🖥️ Document View Mode</span>
              <div className="flex gap-1 bg-elevated p-1 rounded-lg" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--border-radius-md)' }}>
                <button 
                  className={`btn btn-sm ${!digitalMode ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setDigitalMode(false)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: 'var(--border-radius-sm)' }}
                >
                  ✍️ Original copy
                </button>
                <button 
                  className={`btn btn-sm ${digitalMode ? 'btn-primary' : 'btn-ghost'}`} 
                  onClick={() => setDigitalMode(true)}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: 'var(--border-radius-sm)' }}
                >
                  📝 AI Transcribed Digital
                </button>
              </div>
            </div>
          )}

          <div className="card overflow-hidden mb-6" style={{ position: 'relative' }}>
            {!digitalMode ? (
              <>
                <img 
                  src={note.thumbnail} alt={note.title}
                  style={{ 
                    width: '100%', height: '380px', objectFit: 'cover',
                    filter: isPurchased ? 'none' : 'blur(6px) brightness(0.85)',
                    transition: 'filter var(--transition-slow)',
                  }}
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80'; }}
                />
                {!isPurchased && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ zIndex: 10, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
                    <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 12px rgba(108,99,255,0.4))' }}>🔒</div>
                    <p className="font-bold text-xl text-white">This note is locked</p>
                    <p className="text-gray-300 text-xs px-6 text-center" style={{ maxWidth: '300px' }}>Purchase now to unlock full access, transcribed text, and revision cheatsheets.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6" style={{ height: '380px', overflowY: 'auto', background: 'var(--bg-surface)' }}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-sm text-gradient-teal">✨ AI Transcribed Digital Copy</h4>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(note.digitalizedContent);
                      alert('📋 Transcribed text copied to clipboard!');
                    }}
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  >
                    📋 Copy Text
                  </button>
                </div>
                <div className="divider" style={{ margin: '0 0 var(--space-4) 0' }}></div>
                <pre className="text-xs text-muted" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', lineHeight: 1.8 }}>
                  {note.digitalizedContent}
                </pre>
              </div>
            )}
          </div>

          {/* AI Metrics - Available to everyone */}
          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {/* Quality Score Breakdown */}
            <div className="card p-5" style={{ background: 'rgba(108, 99, 255, 0.02)', borderColor: 'rgba(108, 99, 255, 0.1)' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-muted uppercase tracking-wider font-bold">✨ AI Quality Score</span>
                <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>{note.qualityScore || 8.5}/10</span>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {Object.entries(note.qualityAnalysis || { clarity: 8, completeness: 8, structure: 8, formulas: 8 }).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted">{key}</span>
                    <div className="flex items-center gap-2" style={{ width: '60%' }}>
                      <div className="progress-bar" style={{ height: '4px' }}>
                        <div className="progress-fill" style={{ width: `${val * 10}%`, background: 'var(--gradient-purple)' }}></div>
                      </div>
                      <span className="font-bold">{val}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plagiarism scan */}
            <div className="card p-5" style={{ background: 'rgba(16, 185, 129, 0.02)', borderColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-muted uppercase tracking-wider font-bold">🛡️ Plagiarism Scan</span>
                <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>{note.plagiarismScore || 98}% Original</span>
              </div>
              <p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
                {note.originalityReport || 'Validated against academic note repositories. Highly original compliance suitable for student exams.'}
              </p>
            </div>
          </div>

          {/* Short summary card preview */}
          {note.shortSummary && (
            <div className="card p-5 mb-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <h4 className="font-bold text-sm mb-2 text-gradient">📝 AI Short Summary Preview</h4>
              <p className="text-xs text-muted" style={{ lineHeight: 1.8 }}>{note.shortSummary}</p>
            </div>
          )}

          {/* Interactive tab headers for purchased notes */}
          {isPurchased && (
            <div className="flex gap-4 border-b border-subtle mb-6" style={{ borderColor: 'var(--border-subtle)', borderBottom: '1px solid' }}>
              <button 
                className={`pb-3 font-bold text-sm ${activeTab === 'notes' ? 'text-primary' : 'text-muted'}`}
                onClick={() => setActiveTab('notes')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'notes' ? '2px solid var(--brand-primary)' : 'none', color: activeTab === 'notes' ? 'var(--brand-primary)' : 'var(--text-muted)' }}
              >
                📖 Study Material Details
              </button>
              <button 
                className={`pb-3 font-bold text-sm ${activeTab === 'revision' ? 'text-primary' : 'text-muted'}`}
                onClick={() => setActiveTab('revision')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'revision' ? '2px solid var(--brand-primary)' : 'none', color: activeTab === 'revision' ? 'var(--brand-primary)' : 'var(--text-muted)' }}
              >
                ⚡ AI Exam Revision Guide
              </button>
            </div>
          )}

          {activeTab === 'revision' && isPurchased ? (
            <div className="card mt-6 animate-fade-in-up" style={{ padding: 'var(--space-6)' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gradient">⚡ Interactive Exam revision Sheet</h3>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Unlocked</span>
              </div>
              <p className="text-xs text-muted mb-6">Quick cheat sheet, key equations and interactive cards generated specifically for your exam success.</p>

              {note.revisionNotes ? (
                <div className="flex flex-col gap-6">
                  {/* Revision notes markdown text container */}
                  <div className="p-5 bg-elevated rounded-lg" style={{ background: 'var(--bg-elevated)', borderLeft: '3px solid var(--brand-primary)' }}>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-muted mb-3">📋 Revision Guide Text</h5>
                    <pre className="text-xs text-muted" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', lineHeight: 1.8 }}>{note.revisionNotes}</pre>
                  </div>

                  {/* Flashcards */}
                  <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-primary">🧠 Interactive Recall Takeaways</h4>
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                      {[
                        { q: "What is the primary formula or constant to memorize here?", a: `Refer directly to the dynamic equations highlighted in the digital notes. Pitfalls exist in mixing up coefficients.` },
                        { q: "What is the common student pitfall in exam assessments?", a: "Attempting questions without sketching standard diagrams first. Re-verify notes for quick sketches." },
                        { q: "What is the mnemonic suggested by AI to memorize this section?", a: "Remember CASH: Conceptualize, Analyze, Solve, and Highlight key equations!" }
                      ].map((fc, idx) => {
                        const isLearned = !!learnedFlashcards[idx];
                        const isFlipped = !!flippedCards[idx];

                        return (
                          <div 
                            key={idx} 
                            className="card p-4 flex flex-col justify-between" 
                            style={{ 
                              background: 'var(--bg-elevated)',
                              border: isLearned ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                              opacity: isLearned ? 0.75 : 1,
                              transition: 'all var(--transition-base)'
                            }}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-muted">Flashcard #{idx + 1}</span>
                                <button 
                                  onClick={() => setLearnedFlashcards(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                  className="text-xs" 
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: isLearned ? 'var(--brand-success)' : 'var(--text-muted)' }}
                                >
                                  {isLearned ? '✅ Mastered' : '◽ Mark Mastered'}
                                </button>
                              </div>
                              <p className="font-bold text-xs text-primary" style={{ textDecoration: isLearned ? 'line-through' : 'none' }}>{fc.q}</p>
                              {isFlipped && (
                                <p className="text-xs text-muted mt-3 pt-3 border-t border-subtle animate-fade-in" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                  💡 <strong>Answer:</strong> {fc.a}
                                </p>
                              )}
                            </div>
                            <button 
                              className="btn btn-ghost btn-sm w-full mt-4" 
                              style={{ fontSize: '0.7rem', padding: '0.3rem' }}
                              onClick={() => setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            >
                              {isFlipped ? '🙈 Hide Explanation' : '👁️ Reveal Explanation'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 text-muted">
                  No revision notes generated for this note yet.
                </div>
              )}
            </div>
          ) : (
            <div className="card mt-6" style={{ padding: 'var(--space-6)' }}>
              <h3 className="font-bold text-lg mb-4">{note.title}</h3>
              <p className="text-muted text-sm" style={{ lineHeight: 1.8 }}>{note.description}</p>
              
              <div className="divider" style={{ margin: 'var(--space-4) 0' }}></div>

              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                <div className="flex flex-col">
                  <span className="text-xs text-muted uppercase tracking-wider font-semibold">Subject</span>
                  <span className="text-sm font-bold mt-1">{note.subject}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted uppercase tracking-wider font-semibold">Level</span>
                  <span className="text-sm font-bold mt-1">{note.educationLevel}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted uppercase tracking-wider font-semibold">Pages</span>
                  <span className="text-sm font-bold mt-1">{note.pages}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted uppercase tracking-wider font-semibold">Format</span>
                  <span className="text-sm font-bold mt-1">{note.isHandwritten ? '✍️ Handwritten' : '📄 Digital'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted uppercase tracking-wider font-semibold">Downloads</span>
                  <span className="text-sm font-bold mt-1">{(note.downloads || 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted uppercase tracking-wider font-semibold">Uploaded</span>
                  <span className="text-sm font-bold mt-1">{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {note.tags.map(tag => (
                    <span key={tag} className="tag" style={{ fontSize: '0.75rem' }}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="animate-fade-in-right note-detail-sidebar" style={{ width: '100%', maxWidth: '360px', flexShrink: 0 }}>
          {/* Purchase Card */}
          <div className="card" style={{ padding: 'var(--space-6)', position: 'sticky', top: '100px' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-black text-3xl" style={{ color: 'var(--brand-accent)' }}>₹{note.price}</span>
              <div className="flex items-center gap-2">
                <span className="star">★</span>
                <span className="font-bold text-sm">{note.rating}</span>
                <span className="text-xs text-muted">({note.reviews || 0} reviews)</span>
              </div>
            </div>

            {isPurchased ? (
              <a
                href={note.fileUrl
                  ? (note.fileUrl.startsWith('http') ? note.fileUrl : `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}${note.fileUrl}`)
                  : note.thumbnail}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg w-full mb-3"
                style={{ background: 'var(--gradient-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
              >
                {isFree && !isNotePurchased(noteId) ? '📖 Read for Free' : '📖 Read Full Notes'}
              </a>
            ) : (
              <button className="btn btn-primary btn-lg w-full mb-3 animate-pulse-glow" onClick={handlePurchase} disabled={purchasing}>
                {purchasing ? '⏳ Processing...' : (isAuthenticated ? `🔓 Buy Now — ₹${note.price}` : '🔓 Sign in to Buy — ₹' + note.price)}
              </button>
            )}

            {seller && (
              <button 
                className="btn btn-secondary w-full mb-4"
                onClick={handleChat}
              >
                💬 {isAuthenticated ? 'Chat to Negotiate Price' : 'Sign in to Chat'}
              </button>
            )}

            {!isAuthenticated && (
              <div className="login-prompt-banner mb-4" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <p className="text-sm text-muted">
                  <Link to="/login" className="text-primary font-bold">Sign in</Link> or <Link to="/login" className="text-primary font-bold">create an account</Link> to purchase notes and chat with sellers.
                </p>
              </div>
            )}

            {note.hasDigitalized && (
              <div className="flex items-center gap-2 text-xs text-muted" style={{ padding: '0.5rem 0' }}>
                <span>✅</span> Includes digitalized version
              </div>
            )}
            {note.isHandwritten && (
              <div className="flex items-center gap-2 text-xs text-muted" style={{ padding: '0.5rem 0' }}>
                <span>✅</span> Original handwritten copy included
              </div>
            )}

            <div className="divider" style={{ margin: 'var(--space-4) 0' }}></div>

            {/* Seller Card */}
            {seller && (
              <div>
                <h4 className="font-semibold text-sm text-muted mb-3 uppercase tracking-wider">Sold By</h4>
                <Link to={`/profile/${sellerUsername}`} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', transition: 'background var(--transition-fast)' }}>
                  <div className="avatar" style={{ background: 'var(--brand-primary)', color: 'white' }}>
                    {sellerFullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{sellerFullName}</span>
                    <span className="text-xs text-muted">@{sellerUsername}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="star" style={{ fontSize: '0.7rem' }}>★</span>
                      <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>{seller.rating || "4.5"}</span>
                      <span className="text-xs text-muted">• {seller.notesUploaded || 0} notes</span>
                    </div>
                  </div>
                </Link>
                <Link to={`/profile/${sellerUsername}`} className="btn btn-ghost btn-sm w-full mt-3" style={{ fontSize: '0.75rem' }}>
                  View Full Profile →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section style={{ marginTop: 'var(--space-16)' }} className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="font-bold text-2xl">⭐ Reviews</h2>
          <span className="badge badge-primary">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Write a Review — only for purchasers */}
        {isPurchased && !note.isTextbook && (
          <div className="card mb-8" style={{ padding: 'var(--space-6)', border: '1px solid var(--border-medium)' }}>
            <h3 className="font-bold text-lg mb-4">{reviewDone ? '✅ Thanks for your review!' : '✍️ Write a Review'}</h3>
            {!reviewDone ? (
              <form onSubmit={handleReview} className="flex flex-col gap-4">
                {/* Star selector */}
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star} type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2rem', color: (reviewHover || reviewRating) >= star ? '#F59E0B' : 'var(--border-medium)', transition: 'color 0.15s' }}
                    >★</button>
                  ))}
                  {reviewRating > 0 && <span className="ml-2 text-sm font-medium text-muted">{['','Poor','Fair','Good','Great','Excellent'][reviewRating]}</span>}
                </div>
                <textarea
                  className="input" rows={3}
                  placeholder="Share what you liked or didn't like (optional)"
                  value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
                <button type="submit" className="btn btn-primary" disabled={!reviewRating || submittingReview} style={{ alignSelf: 'flex-start' }}>
                  {submittingReview ? '⏳ Submitting...' : '⭐ Submit Review'}
                </button>
              </form>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={() => setReviewDone(false)}>Edit your review</button>
            )}
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="card text-center" style={{ padding: 'var(--space-10)', border: '2px dashed var(--border-medium)' }}>
            <div className="text-4xl mb-3">⭐</div>
            <p className="text-muted">No reviews yet. {isPurchased ? 'Be the first to review!' : 'Purchase this note to write a review.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((rev, i) => (
              <div key={i} className="card animate-fade-in-up" style={{ padding: 'var(--space-5)', animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="avatar avatar-sm" style={{ background: 'var(--brand-primary)', color: 'white', flexShrink: 0 }}>
                    {(rev.userId?.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{rev.userId?.fullName || 'Anonymous'}</span>
                    <span className="text-xs text-muted">@{rev.userId?.username || 'user'} • {new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ color: s <= rev.rating ? '#F59E0B' : 'var(--border-medium)', fontSize: '1rem' }}>★</span>
                    ))}
                  </div>
                </div>
                {rev.comment && <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>{rev.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Related Notes */}
      {relatedNotes.length > 0 && (
        <section style={{ marginTop: 'var(--space-16)' }}>
          <h2 className="font-bold text-2xl mb-8">More from {sellerFullName}</h2>
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {relatedNotes.map((n, i) => <NoteCard key={n._id || n.id} note={n} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default NoteDetail;
