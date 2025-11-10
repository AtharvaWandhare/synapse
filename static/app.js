// static/app.js - Job Seeker Discover Page Logic

document.addEventListener('DOMContentLoaded', () => {
    // Only run this script on the discover page
    const jobCard = document.getElementById('job-card');
    if (!jobCard) return;

    const likeBtn = document.getElementById('like-btn');
    const dislikeBtn = document.getElementById('dislike-btn');

    let currentJobId = null;
    let isLoading = false;

    // Function to load the next job
    async function getNextJob() {
        if (isLoading) return;
        isLoading = true;
        
        try {
            const response = await fetch('/api/get-next-job');
            
            if (!response.ok) {
                throw new Error('No more jobs');
            }
            
            const job = await response.json();
            
            // Populate the job card with animation
            jobCard.style.opacity = '0';
            
            setTimeout(() => {
                jobCard.innerHTML = `
                    <div class="job-card-header">
                        <h2 class="job-card-title">${job.title}</h2>
                        <div class="job-card-company">${job.company}</div>
                    </div>
                    
                    <div class="job-card-meta">
                        <span>📍 ${job.location}</span>
                        <span>💼 ${job.jobType || 'Full-time'}</span>
                        ${job.salaryRange ? `<span>💰 ${job.salaryRange}</span>` : ''}
                    </div>
                    
                    <div class="job-card-section">
                        <h4>About the Role</h4>
                        <p>${job.description}</p>
                    </div>
                    
                    ${job.applyUrl ? `
                    <div class="job-card-footer">
                        <a href="${job.applyUrl}" target="_blank" class="btn btn-secondary btn-sm" onclick="event.stopPropagation()">
                            View Details →
                        </a>
                        <span class="applications-status applications-open">✓ Applications Open</span>
                    </div>
                    ` : ''}
                `;
                
                currentJobId = job.jobId;
                jobCard.style.opacity = '1';
            }, 300);
            
        } catch (error) {
            jobCard.innerHTML = `
                <div class="no-jobs-state">
                    <h3>🎉 All Caught Up!</h3>
                    <p>You've reviewed all available jobs. Check back later for new opportunities!</p>
                    <a href="/matches" class="btn btn-primary">View My Matches</a>
                </div>
            `;
            likeBtn.style.display = 'none';
            dislikeBtn.style.display = 'none';
        } finally {
            isLoading = false;
        }
    }

    // Function to handle a swipe
    async function swipe(isLike) {
        if (!currentJobId || isLoading) return;

        // Disable buttons during swipe
        likeBtn.disabled = true;
        dislikeBtn.disabled = true;

        // Add animation class
        jobCard.classList.add(isLike ? 'swipe-right' : 'swipe-left');

        try {
            await fetch('/api/swipe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobId: currentJobId,
                    isLike: isLike
                })
            });

            // Wait for animation to complete
            setTimeout(() => {
                jobCard.classList.remove('swipe-right', 'swipe-left');
                // Load the next job
                getNextJob();
                
                // Re-enable buttons
                likeBtn.disabled = false;
                dislikeBtn.disabled = false;
            }, 300);

        } catch (error) {
            console.error('Error swiping:', error);
            jobCard.classList.remove('swipe-right', 'swipe-left');
            likeBtn.disabled = false;
            dislikeBtn.disabled = false;
        }
    }

    // Add event listeners to buttons
    likeBtn.addEventListener('click', () => swipe(true));
    dislikeBtn.addEventListener('click', () => swipe(false));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            swipe(false);
        } else if (e.key === 'ArrowRight') {
            swipe(true);
        }
    });

    // Load the first job on page load
    getNextJob();
});

// Auto-close flash messages after 5 seconds
document.addEventListener('DOMContentLoaded', () => {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
});

// Hide/Unhide Match functionality for matches page
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-hide-match')) {
        const matchId = e.target.getAttribute('data-match-id');
        
        if (!confirm('Are you sure you want to hide this job? You can restore it from the Hidden Jobs page.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/hide-match/${matchId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Job hidden successfully!');
                // Remove the card from view with animation
                const card = e.target.closest('.match-card');
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => card.remove(), 300);
            } else {
                alert(data.error || 'Failed to hide job');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred');
        }
    }
});
