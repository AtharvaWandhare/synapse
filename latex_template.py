"""
Default LaTeX resume template
"""

DEFAULT_TEMPLATE = r"""\documentclass[10pt, letterpaper]{article}

% Packages:
\usepackage[
    ignoreheadfoot, % set margins without considering header and footer
    top=2 cm, % seperation between body and page edge from the top
    bottom=2 cm, % seperation between body and page edge from the bottom
    left=2 cm, % seperation between body and page edge from the left
    right=2 cm, % seperation between body and page edge from the right
    footskip=1.0 cm, % seperation between body and footer
    % showframe % for debugging
]{geometry} % for adjusting page geometry
\usepackage{titlesec} % for customizing section titles
\usepackage{tabularx} % for making tables with fixed width columns
\usepackage{array} % tabularx requires this
\usepackage[dvipsnames]{xcolor} % for coloring text
\definecolor{primaryColor}{RGB}{0, 79, 144} % define primary color (kept for potential future use or other elements)
\usepackage{enumitem} % for customizing lists
\usepackage{fontawesome5} % for using icons
\usepackage{amsmath} % for math (still not strictly needed for this content, but harmless)
\usepackage{hyperref} % for links, metadata and bookmarks
% Removed [pscoord]{eso-pic} and [calc] as \placelastupdatedtext is removed
\usepackage{bookmark} % for bookmarks
\usepackage{lastpage} % for getting the total number of pages
\usepackage{changepage} % for one column entries (adjustwidth environment)
\usepackage{paracol} % for two and three column entries
\usepackage{ifthen} % for conditional statements
\usepackage{needspace} % for avoiding page brake right after the section title
\usepackage{iftex} % check if engine is pdflatex, xetex or luatex

% Ensure that generate pdf is machine readable/ATS parsable:
\ifPDFTeX
    \input{glyphtounicode}
    \pdfgentounicode=1
    % \usepackage[T1]{fontenc} % this breaks sb2nov - keep commented unless you know you need it
    \usepackage[utf8]{inputenc}
    \usepackage{lmodern} % Good font
\fi

% Some settings:
\AtBeginEnvironment{adjustwidth}{\partopsep0pt} % remove space before adjustwidth environment
\pagestyle{empty} % no header or footer by default, custom footer is applied later
\setcounter{secnumdepth}{0} % no section numbering
\setlength{\parindent}{0pt} % no indentation
\setlength{\topskip}{0pt} % no top skip
\setlength{\columnsep}{0cm} % set column seperation
\makeatletter
\let\ps@customFooterStyle\ps@plain % Copy the plain style to customFooterStyle
\patchcmd{\ps@customFooterStyle}{\thepage}{
    \color{gray}\textit{\small Your Name - Page \thepage{} of \pageref*{LastPage}}
}{}{} % replace number by desired string
\makeatother
\pagestyle{customFooterStyle} % Apply the custom footer style

% --- FIX: Corrected titlesec setup to prevent printing parameters and ensure proper line placement ---
% Format: Title is bold large, followed by some space and a rule


% \titleformat{\section}{\needspace{4\baselineskip}\bfseries\large}{}{0pt}{\vspace{0.2cm}\titlerule}

\titleformat{\section}
  {\needspace{4\baselineskip}\bfseries\large}{}{0pt}{}[\vspace{0cm}\titlerule]



% Spacing: 0pt left indent, 0.3cm space *before* the section title block, 0.2cm space *after* the section title block (which includes the rule)
% Using * version so left spacing is absolute 0pt
\titlespacing{\section}{0pt}{0.4cm}{0.2cm}
% --- END FIX: titlesec ---


\renewcommand\labelitemi{$\circ$} % custom bullet points
\newenvironment{highlights}{
    \begin{itemize}[
        topsep=0.10 cm,
        parsep=0.10 cm, % space between paragraphs in an item
        partopsep=0pt, % space between environment and first item
        itemsep=0pt, % space between items
        leftmargin=0.5 cm % Align with text margin
    ]
}{
    \end{itemize}
} % new environment for highlights


\newenvironment{onecolentry}{
    \begin{adjustwidth}{
        0.2 cm
    }{
        0.2 cm
    }
}{
    \end{adjustwidth}
} % new environment for one column entries

% Definition for two-column entry: #1 is the content for the second column (usually dates/location)
\newenvironment{twocolentry}[1]{
    \onecolentry % Use the onecolentry margins
    \def\secondColumn{#1} % Store the second column content
    % Set column widths: \fill for the main content, fixed width for the second column
    % Adjust 4.5 cm as needed based on content length (e.g., "2022 - 2026")
    \setcolumnwidth{\fill, 4.5 cm}
    \begin{paracol}{2} % Start two columns
}{
    \switchcolumn \raggedleft \secondColumn % Switch to the second column and place content, right-aligned
    \end{paracol} % End two columns
    \endonecolentry % End the onecolentry margins
} % new environment for two column entries

\newenvironment{header}{
    \setlength{\topsep}{0pt}\par\kern\topsep\centering\linespread{1.5}
}{
    \par\kern\topsep
} % new environment for the header

% --- FIX: Simplified link command using hidelinks ---
% \href is now the standard command provided by hyperref.
% hidelinks in hyperref options makes links clickable but invisible.
% Removed the custom \hrefWithoutArrow and the custom \renewcommand{\href}
% --- END FIX: Simplified link command ---


% --- FIX: Configure hyperref - Use hidelinks for clean resume presentation ---
\hypersetup{
    pdftitle={Your Name's Resume},
    pdfauthor={Your Name},
    pdfcreator={LaTeX with Synapse},
    hidelinks % Makes links clickable but invisible (no color, no border)
}
% --- END FIX: hyperref config ---


\begin{document}

\begin{header}
    \textbf{\fontsize{22 pt}{22 pt}\selectfont Your Name}
    
    \vspace{0.2 cm}
    
    \normalsize
    \mbox{\href{mailto:your.email@example.com}{\faEnvelope[regular]\hspace*{0.13cm}your.email@example.com}}
    \quad
    \mbox{\href{tel:+11234567890}{\faPhone*\hspace*{0.13cm}+1 123 456 7890}}
    \quad
    \mbox{\faMapMarker*\hspace*{0.13cm}City, Country}}
    \quad
    \mbox{\href{https://linkedin.com/in/yourprofile}{\faLinkedinIn\hspace*{0.13cm}in/yourprofile}}
    \quad
    \mbox{\href{https://github.com/yourusername}{\faGithub\hspace*{0.13cm}@yourusername}}
\end{header}

\section{Summary}
\begin{onecolentry}
    Write a compelling 2-3 sentence summary highlighting your key skills, experience, and career goals. Focus on what makes you unique and valuable to potential employers.
\end{onecolentry}

\section{Education}

\begin{twocolentry}{\textit{2020 – 2024}}
	\textbf{Your University Name}
	\newline \textit{Bachelor of Science in Computer Science}
\end{twocolentry}

\begin{onecolentry}
    \begin{highlights}
        \item \textbf{GPA:} 3.8/4.0
        \item \textbf{Coursework:} Data Structures, Algorithms, Database Systems, Software Engineering
    \end{highlights}
\end{onecolentry}

\section{Technical Skills}

\begin{onecolentry}
    \textbf{Languages:} Python, JavaScript, Java, C++
\end{onecolentry}

\begin{onecolentry}
    \textbf{Frontend:} React, Vue.js, HTML5, CSS3, Tailwind CSS
\end{onecolentry}

\begin{onecolentry}
    \textbf{Backend:} Node.js, Express.js, Django, Flask
\end{onecolentry}

\begin{onecolentry}
    \textbf{Databases:} PostgreSQL, MongoDB, MySQL
\end{onecolentry}

\begin{onecolentry}
    \textbf{Tools:} Git, Docker, AWS, Linux
\end{onecolentry}

\section{Experience}

\begin{twocolentry}{\textit{Jan 2024 - Present}}
	\textbf{Company Name} \hfill \textit{City, Country}
	\newline \textbf{\textit{Job Title}}
\end{twocolentry}

\begin{onecolentry}
    \begin{highlights}
        \item Describe your key achievement or responsibility with specific metrics and impact
        \item Another significant accomplishment demonstrating your technical or leadership skills
        \item Third point showcasing problem-solving abilities or innovation
    \end{highlights}
\end{onecolentry}

\section{Projects}

\begin{onecolentry}
    \textbf{Project Name} \hfill \textit{Technologies Used} \\
    \begin{highlights}
        \item Brief description of what the project does and the problem it solves
        \item Key technical implementations or architectural decisions you made
        \item Impact or results (users, performance improvements, etc.)
    \end{highlights}    
\end{onecolentry}

\vspace{0.2cm}

\begin{onecolentry}
    \textbf{Another Project} \hfill \textit{Tech Stack} \\
    \begin{highlights}
        \item Project description and purpose
        \item Technical highlights and challenges overcome
        \item Measurable outcomes or achievements
    \end{highlights}    
\end{onecolentry}

\section{Certifications}

\begin{twocolentry}{\textit{2024}}
	\href{https://certification-url.com}{\textbf{Certification Name}}
	\newline \textit{Issuing Organization}
\end{twocolentry}

\section{Achievements}

\begin{onecolentry}
    \textbf{Award or Recognition}
    \begin{highlights}
        \item Brief description of the achievement and its significance
    \end{highlights}
\end{onecolentry}

\end{document}
"""
