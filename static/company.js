// static/company.js - Company Portal Management Logic

// Delete a job posting
async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/company/delete-job/${jobId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Remove the row from the table with animation
            const row = document.querySelector(`tr[data-job-id="${jobId}"]`);
            if (row) {
                row.style.opacity = '0';
                setTimeout(() => row.remove(), 300);
            }
            
            // Show success message
            showMessage('Job deleted successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to delete job', 'error');
        }
    } catch (error) {
        console.error('Error deleting job:', error);
        showMessage('An error occurred while deleting the job', 'error');
    }
}

// Toggle job active status
async function toggleJobStatus(jobId, currentStatus) {
    try {
        const response = await fetch(`/api/company/update-job/${jobId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                is_active: !currentStatus
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Job status updated!', 'success');
            // Reload the page to reflect changes
            setTimeout(() => location.reload(), 1000);
        } else {
            showMessage(data.error || 'Failed to update job status', 'error');
        }
    } catch (error) {
        console.error('Error updating job:', error);
        showMessage('An error occurred while updating the job', 'error');
    }
}

// Show temporary message
function showMessage(message, type) {
    const flashContainer = document.querySelector('.flash-container') || createFlashContainer();
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        ${message}
        <button onclick="this.parentElement.remove()" class="close-btn">&times;</button>
    `;
    
    flashContainer.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// Create flash container if it doesn't exist
function createFlashContainer() {
    const container = document.createElement('div');
    container.className = 'flash-container';
    document.body.insertBefore(container, document.body.firstChild);
    return container;
}

// Search/filter functionality for applicants page
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('applicant-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const applicantCards = document.querySelectorAll('.applicant-card');
            
            applicantCards.forEach(card => {
                const name = card.querySelector('h3').textContent.toLowerCase();
                const email = card.querySelector('.applicant-email').textContent.toLowerCase();
                const jobTitle = card.querySelector('.applicant-job p').textContent.toLowerCase();
                
                if (name.includes(searchTerm) || email.includes(searchTerm) || jobTitle.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Event delegation for delete buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const jobId = e.target.getAttribute('data-job-id');
            if (jobId) {
                deleteJob(jobId);
            }
        }
    });
});
