// --- Configuration ---
// Your Web3Forms Access Key
const WEB3FORMS_ACCESS_KEY = "e8dfff52-ae0f-47bc-bae2-88605fadfdba";
const QUIZ_QUESTIONS_COUNT = 5; // Total number of questions presented in the quiz
const MIN_ANSWER_LENGTH = 5; // Minimum characters required for an answer

// Define available classes/categories for the dropdown
const availableClasses = [
    "9th", "10th", "11th Arts", "11th Medical", "11th Non-Medical",
    "12th Arts", "12th Medical", "12th Non-Medical", "General" // Added 'General' for questions that might apply to all
];


// --- Quiz Data ---
let allQuestions = []; // Will store questions loaded from data.json

// --- Quiz State Variables ---
let quizQuestions = []; // Stores the actual question objects for this quiz session (dynamically changed by penalty)
let currentQuestionIndex = 0; // Current index in quizQuestions array (0 to QUIZ_QUESTIONS_COUNT-1)
let studentAnswers = []; // Stores { questionId, questionText, userAnswer } for each quiz slot
let tabSwitchCount = 0;
let studentInfo = {
    selectedCategories: [] // New property to store selected categories
};
let isQuizCompleted = false; // Flag to prevent multiple submissions and manage event listeners

// --- Cached DOM Elements ---
// Student Form Elements
const studentNameInput = document.getElementById('studentName');
const studentEmailInput = document.getElementById('studentEmail');
const studentClassInput = document.getElementById('studentClass');
const studentFormSection = document.getElementById('studentForm');
const startQuizBtn = document.getElementById('startQuizBtn');

// New dropdown elements
const selectedClassesDisplay = document.getElementById('selectedClassesDisplay');
const classDropdownToggle = document.getElementById('classDropdownToggle');
const classOptionsContainer = document.getElementById('classOptionsContainer');

// Quiz Section Elements
const quizSection = document.getElementById('quizSection');
const displayNameSpan = document.getElementById('displayName');
const displayEmailSpan = document.getElementById('displayEmail');
const displayClassSpan = document.getElementById('displayClass');
const displayCategoriesSpan = document.getElementById('displayCategories'); // New span for categories display
const studentInfoDisplayDiv = document.getElementById('studentInfoDisplay');
const questionTextDiv = document.getElementById('questionText');
const questionCounterDiv = document.getElementById('questionCounter');
const answerInputTextarea = document.getElementById('answerInput');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const submitTextSpan = document.getElementById('submitText');
const submitSpinner = document.getElementById('submitSpinner');
const completionMessageDiv = document.getElementById('completionMessage');
const progressFillDiv = document.getElementById('progressFill');
const statusIndicatorDiv = document.getElementById('statusIndicator');
const statusTextSpan = document.getElementById('statusText');
const warningDiv = document.querySelector('.warning');

// --- Functions ---

/**
 * Initializes the quiz after student information is collected.
 */
function startQuiz() {
    const name = studentNameInput.value.trim();
    const email = studentEmailInput.value.trim();
    const studentClassText = studentClassInput.value.trim(); // The user's typed class/grade

    if (!validateStudentInfo(name, email, studentClassText)) {
        return; // Validation failed, stop here
    }

    if (studentInfo.selectedCategories.length === 0) {
        alert('Please select at least one question category for the quiz.');
        return;
    }

    // Store student info
    studentInfo.name = name;
    studentInfo.email = email;
    studentInfo.class = studentClassText; // This is the typed class, not the categories
    studentInfo.startTime = new Date().toISOString();
    // studentInfo.selectedCategories is already updated by the checkbox listeners

    // Hide student form and show quiz
    studentFormSection.style.display = 'none';
    quizSection.style.display = 'block';

    // Display student info in quiz section
    displayNameSpan.textContent = studentInfo.name;
    displayEmailSpan.textContent = studentInfo.email;
    displayClassSpan.textContent = studentInfo.class;
    displayCategoriesSpan.textContent = studentInfo.selectedCategories.join(', ') || 'N/A'; // Display selected categories
    studentInfoDisplayDiv.style.display = 'block';

    initializeQuizLogic();
}

/**
 * Validates student information inputs.
 * @param {string} name - Student's full name.
 * @param {string} email - Student's email address.
 * @param {string} studentClass - Student's class.
 * @returns {boolean} True if all inputs are valid, false otherwise.
 */
function validateStudentInfo(name, email, studentClass) {
    if (!name) {
        alert('Please enter your full name.');
        studentNameInput.focus();
        return false;
    }
    if (!email) {
        alert('Please enter your email address.');
        studentEmailInput.focus();
        return false;
    }
    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        studentEmailInput.focus();
        return false;
    }
    if (!studentClass) {
        alert('Please enter your class/grade.');
        studentClassInput.focus();
        return false;
    }
    return true;
}

/**
 * Populates the custom dropdown with class options.
 */
function populateClassDropdown() {
    classOptionsContainer.innerHTML = ''; // Clear existing options
    availableClasses.forEach(className => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('class-option');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `class-${className.replace(/\s+/g, '-')}`; // Unique ID
        checkbox.value = className;
        checkbox.checked = studentInfo.selectedCategories.includes(className); // Set initial checked state

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = className;

        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(label);
        classOptionsContainer.appendChild(optionDiv);

        checkbox.addEventListener('change', (event) => {
            if (event.target.checked) {
                if (!studentInfo.selectedCategories.includes(className)) {
                    studentInfo.selectedCategories.push(className);
                }
            } else {
                studentInfo.selectedCategories = studentInfo.selectedCategories.filter(cat => cat !== className);
            }
            updateSelectedClassesDisplay();
        });
    });
    updateSelectedClassesDisplay(); // Initialize display text
}

/**
 * Updates the text displayed in the custom dropdown based on selected categories.
 */
function updateSelectedClassesDisplay() {
    if (studentInfo.selectedCategories.length === 0) {
        selectedClassesDisplay.textContent = 'Select categories...';
        selectedClassesDisplay.style.color = '#999'; // Placeholder color
    } else {
        selectedClassesDisplay.textContent = studentInfo.selectedCategories.join(', ');
        selectedClassesDisplay.style.color = '#333'; // Active color
    }
}

/**
 * Toggles the visibility of the custom class dropdown.
 */
function toggleClassDropdown() {
    classOptionsContainer.classList.toggle('open');
    classDropdownToggle.classList.toggle('open');
}

/**
 * Sets up the initial quiz questions and attaches global event listeners.
 * Modified to load questions asynchronously from data.json and filter by category.
 */
async function initializeQuizLogic() {
    // Load questions from JSON
    try {
        const response = await fetch('data.json');
        allQuestions = await response.json();
    } catch (error) {
        console.error('Error loading questions from data.json:', error);
        alert('Failed to load quiz questions. Please try again later.');
        return; // Stop quiz initialization if questions can't be loaded
    }

    // Filter questions based on selected categories
    let filteredQuestions = allQuestions.filter(q => {
        if (!q.category || !Array.isArray(q.category)) {
            return false; // Question must have an array of categories
        }
        // Check if any of the question's categories are in the student's selected categories
        return q.category.some(qc => studentInfo.selectedCategories.includes(qc));
    });

    if (filteredQuestions.length < QUIZ_QUESTIONS_COUNT) {
        alert(`Not enough questions available for the selected categories (${studentInfo.selectedCategories.join(', ')}). Please select more categories or reduce quiz question count.`);
        // Optionally, reset form or go back
        studentFormSection.style.display = 'block';
        quizSection.style.display = 'none';
        return;
    }
    
    quizQuestions = getRandomUniqueQuestions(QUIZ_QUESTIONS_COUNT, filteredQuestions);
    
    // Initialize student answers array with nulls, ready to be filled
    studentAnswers = new Array(quizQuestions.length).fill(null);

    loadQuestion();
    updateProgress();

    // Attach event listeners for tab switching penalties
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
}

/**
 * Generates a random selection of unique questions from a given pool.
 * @param {number} count - The number of questions to select.
 * @param {Array<Object>} pool - The array of question objects to choose from.
 * @returns {Array<Object>} An array of selected unique question objects.
 */
function getRandomUniqueQuestions(count, pool) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Loads the current question into the UI elements.
 */
function loadQuestion() {
    if (currentQuestionIndex >= quizQuestions.length) {
        // This state should ideally be prevented by button logic,
        // `submitQuiz` is the intended final handler.
        console.warn("Attempted to load question beyond quiz length. Completing UI.");
        completeQuizUI();
        return;
    }

    const question = quizQuestions[currentQuestionIndex];

    questionTextDiv.textContent = question.text;
    questionCounterDiv.textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;

    // Pre-fill answer if already saved for this slot (e.g., if user went back or after penalty change)
    const savedAnswer = studentAnswers[currentQuestionIndex];
    answerInputTextarea.value = savedAnswer ? savedAnswer.userAnswer : '';

    // Update button visibility based on current question index
    if (currentQuestionIndex === quizQuestions.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'inline-block';
        submitBtn.style.display = 'none';
    }
    answerInputTextarea.focus(); // Focus on the answer input for user convenience
}

/**
 * Saves the current answer to the studentAnswers array.
 * This function captures the current question text and the user's input for the current slot.
 */
function saveCurrentAnswer() {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const userAnswer = answerInputTextarea.value.trim();

    studentAnswers[currentQuestionIndex] = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        userAnswer: userAnswer
    };
}

/**
 * Handles advancing to the next question.
 * Validates the current answer before proceeding.
 */
function nextQuestion() {
    const userAnswer = answerInputTextarea.value.trim();
    if (userAnswer.length < MIN_ANSWER_LENGTH) {
        alert(`Please provide a more detailed answer (at least ${MIN_ANSWER_LENGTH} characters).`);
        return;
    }

    saveCurrentAnswer(); // Save the answer for the current question

    currentQuestionIndex++;
    updateProgress();

    if (currentQuestionIndex < quizQuestions.length) {
        loadQuestion();
    } else {
        // This block should only theoretically be hit if 'next' is somehow
        // triggered after the last question. 'submitQuiz' is the primary handler.
        completeQuizUI();
    }
}

/**
 * Handles quiz submission, collects all data, and sends it to Web3Forms.
 * The email body is now an HTML snippet with inline styles.
 */
async function submitQuiz() {
    // Final answer save for the last question
    const userAnswer = answerInputTextarea.value.trim();
    if (userAnswer.length < MIN_ANSWER_LENGTH) {
        alert(`Please provide a more detailed answer for the last question (at least ${MIN_ANSWER_LENGTH} characters).`);
        return;
    }
    saveCurrentAnswer();

    // Prevent multiple submissions
    if (isQuizCompleted) return;
    isQuizCompleted = true; // Mark quiz as being submitted

    // Disable UI elements and show spinner during submission
    disableQuizUI(true);

    // Record end time and total tab switches
    studentInfo.endTime = new Date().toISOString();
    studentInfo.tabSwitches = tabSwitchCount;

    // Construct HTML email body with all submitted answers (HTML snippet with inline styles)
    // Removed the full HTML boilerplate (<html>, <head>, <body> tags).
    // Added a main container div with essential styles for consistent rendering.
    let emailBody = `
        
            Quiz Results for ${studentInfo.name}
            Email: 
            ->${studentInfo.email}
            Class: 
            ->${studentInfo.class}
            Quiz Start Time: 
            ->${new Date(studentInfo.startTime).toLocaleString()}
            Quiz End Time: 
            ->${new Date(studentInfo.endTime).toLocaleString()}
            Tab Switches (Penalties): 
            ->${studentInfo.tabSwitches}
            Submitted Answers:
    `;

    studentAnswers.forEach((answer, index) => {
        if (answer) {
            emailBody += `
                Question ${index + 1}: 
                --->${answer.questionText}
                    Answer: 
                    ---> ${answer.userAnswer || '[No answer provided]'}
            `;
        } else {
            emailBody += `
                Question ${index + 1}: [No question or answer for this slot]
            `;
        }
    });
    emailBody += `
            
            This quiz submission was processed via a client-side JavaScript application using Web3Forms.
        
    `;

    // Prepare data for Web3Forms as JSON
    const submissionData = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Quiz Submission from ${studentInfo.name} (${studentInfo.class})`,
        from_name: "GHSS Question Box", // Changed from "Quiz App" to "GHSS Question Box"
        // Direct fields for Web3Forms dashboard/metadata:
        "Student Name": studentInfo.name,
        "Student Email": studentInfo.email,
        "Student Class/Grade": studentInfo.class,
        "Quiz Categories Selected": studentInfo.selectedCategories.join(', ') || 'None', // Display selected categories in Web3Forms dashboard too
        "Quiz Start Time": new Date(studentInfo.startTime).toLocaleString(),
        "Quiz End Time": new Date(studentInfo.endTime).toLocaleString(),
        "Tab Switches (Penalty Count)": studentInfo.tabSwitches,
        // The actual email content:
        "message" : emailBody, // The HTML content snippet
        html_email: true // This flag tells Web3Forms to treat 'message' as HTML
    };

    try {
        const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json", // Important: set header for JSON payload
                "Accept": "application/json"
            },
            body: JSON.stringify(submissionData) // Send the JSON object as a string
        });

        const data = await response.json();

        if (data.success) {
            console.log("Form Submitted Successfully:", data);
            completeQuizUI(); // Show completion message on success
        } else {
            console.error("Form Submission Error:", data);
            alert(`Failed to submit quiz: ${data.message || 'Unknown error.'} Please try again.`);
            disableQuizUI(false); // Re-enable UI on error
            isQuizCompleted = false; // Allow re-submission
        }
    } catch (error) {
        console.error("Network or Fetch Error:", error);
        alert("A network error occurred. Please check your internet connection and try again.");
        disableQuizUI(false); // Re-enable UI on network error
        isQuizCompleted = false; // Allow re-submission
    }
}

/**
 * Disables or re-enables quiz UI elements (buttons, textarea) during submission.
 * @param {boolean} isDisabled - True to disable, false to enable.
 */
function disableQuizUI(isDisabled) {
    nextBtn.disabled = isDisabled;
    submitBtn.disabled = isDisabled;
    answerInputTextarea.disabled = isDisabled;
    if (isDisabled) {
        submitTextSpan.style.display = 'none';
        submitSpinner.style.display = 'inline-block';
    } else {
        submitTextSpan.style.display = 'inline-block';
        submitSpinner.style.display = 'none';
    }
}

/**
 * Displays the quiz completion message and cleans up global event listeners.
 */
function completeQuizUI() {
    quizSection.style.display = 'none';
    completionMessageDiv.style.display = 'block';
    // Remove visibility change listeners after quiz completion to stop penalties
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    updateStatus('Completed'); // Update status indicator
}

/**
 * Updates the progress bar width based on the current question index.
 */
function updateProgress() {
    const progress = (currentQuestionIndex / QUIZ_QUESTIONS_COUNT) * 100;
    progressFillDiv.style.width = `${progress}%`;
}

/**
 * Handles changes in document visibility (e.g., user switches browser tabs).
 * Triggers penalty if the quiz is active and not yet completed.
 */
function handleVisibilityChange() {
    if (document.hidden && !isQuizCompleted) {
        updateStatus('Away');
        handleTabSwitchPenalty();
    } else if (!isQuizCompleted) {
        updateStatus('Active');
    }
}

/**
 * Handles window losing focus (e.g., user switches to another application).
 * Triggers penalty if the quiz is active and not yet completed.
 */
function handleWindowBlur() {
    if (!isQuizCompleted) {
        updateStatus('Away');
        handleTabSwitchPenalty();
    }
}

/**
 * Handles window gaining focus.
 */
function handleWindowFocus() {
    if (!isQuizCompleted) {
        updateStatus('Active');
    }
}

/**
 * Implements the penalty for tab/app switching: changes the current question.
 * It ensures the new question is unique within the context of this quiz session.
 */
function handleTabSwitchPenalty() {
    if (isQuizCompleted) return; // Don't penalize if quiz is already done/submitting

    // Prevent changing question on the very last question, just count the penalty
    if (currentQuestionIndex >= quizQuestions.length - 1) {
        tabSwitchCount++;
        showTabSwitchWarning();
        return; 
    }

    // First, save the answer for the question the user was *currently* on
    // before it potentially gets replaced.
    saveCurrentAnswer();

    tabSwitchCount++;
    showTabSwitchWarning();

    // Identify all question IDs that have been *part* of this quiz session's `quizQuestions` array so far.
    // This set dynamically updates as questions are replaced.
    const currentlyUsedQuestionIds = new Set(quizQuestions.map(q => q.id));

    // Find questions from the master `allQuestions` array that have NOT been part of this quiz session.
    // Ensure new questions also match currently selected categories.
    const availableNewQuestions = allQuestions.filter(q => 
        !currentlyUsedQuestionIds.has(q.id) && 
        (q.category && Array.isArray(q.category) && q.category.some(qc => studentInfo.selectedCategories.includes(qc)))
    );

    if (availableNewQuestions.length > 0) {
        // Pick a random new question from the truly unseen ones
        const newQuestion = availableNewQuestions[Math.floor(Math.random() * availableNewQuestions.length)];

        // Replace the question in the current slot of `quizQuestions` array
        quizQuestions[currentQuestionIndex] = newQuestion;

        // Clear the answer input as it's a new question for the user
        answerInputTextarea.value = '';

        // Load the newly replaced question into the UI
        loadQuestion();
    } else {
        // This is an edge case: if the total pool of 'allQuestions' is very small,
        // and all have been used or seen across penalty changes, or no more questions match categories.
        // In this situation, the current question remains, but the tab switch is still counted.
        console.warn("No new unique questions available to replace for penalty (or no more matching selected categories). Keeping current question.");
    }
}

/**
 * Updates the status indicator text and styling.
 * @param {string} status - The status text (e.g., 'Active', 'Away', 'Completed').
 */
function updateStatus(status) {
    statusTextSpan.textContent = status;
    statusIndicatorDiv.className = 'status-indicator'; // Reset classes first

    if (status === 'Active') {
        statusIndicatorDiv.classList.add('status-active');
    } else if (status === 'Away') {
        statusIndicatorDiv.classList.add('status-away');
    } else if (status === 'Completed') {
        statusIndicatorDiv.classList.add('status-completed');
    }
}

/**
 * Displays a temporary warning message for tab switches.
 */
function showTabSwitchWarning() {
    warningDiv.style.background = '#ff4757'; // Brighter red for immediate warning
    warningDiv.innerHTML = `⚠️ Question changed due to tab switch! (${tabSwitchCount} times)`;

    // Revert to original warning message after a few seconds
    setTimeout(() => {
        warningDiv.style.background = '#ff6b6b'; // Original red
        warningDiv.innerHTML = '⚠️ Warning: Switching tabs or apps will change your question!';
    }, 3000); // Revert after 3 seconds
}

// --- Event Listeners (Initial Setup on DOM Ready) ---
document.addEventListener('DOMContentLoaded', () => {
    populateClassDropdown(); // Populate dropdown on load

    startQuizBtn.addEventListener('click', startQuiz);
    nextBtn.addEventListener('click', nextQuestion);
    submitBtn.addEventListener('click', submitQuiz);

    classDropdownToggle.addEventListener('click', toggleClassDropdown);
    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.custom-dropdown-container') && classOptionsContainer.classList.contains('open')) {
            toggleClassDropdown();
        }
    });
});