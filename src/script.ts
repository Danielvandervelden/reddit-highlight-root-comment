const darkMode = {
    backgroundColor: "#2e2e2e",
};

const lightMode = {
    backgroundColor: "#e0ddff",
};

const observeUrlChange = () => {
    let oldHref = document.location.href;
    const body = document.querySelector("body");
    const observer = new MutationObserver((mutations) => {
        if (oldHref !== document.location.href) {
            const Event = new CustomEvent("custom-navigate");
            document.dispatchEvent(Event);
            oldHref = document.location.href;
            // console.log("URL changed, reinitialising");
            initialiser();
        }
    });

    if (body) {
        observer.observe(body, { childList: true, subtree: true });
    }
};

window.onload = observeUrlChange;

function isDarkMode() {
    return !!document.getElementsByTagName("html")[0].classList.contains("theme-dark");
}

function initialiser() {
    // Check if we're on a thread page
    if (!window.location.href.includes("comments")) {
        // console.log("We're not on a thread page, so we don't do anything");
        return;
    }

    //Next we check if there's any comments at all.
    const commentCountIcon = document.querySelector(".icon-comment");

    // If we can't find the icon, that means it's not loaded yet, so we retry in 1 second.
    if (!commentCountIcon) {
        setTimeout(() => {
            initialiser();
        }, 1000);
    }

    // If we actually have found the icon, we check how many comments there are. If there are none, we don't have to do anything.
    const commentCountSpan = commentCountIcon?.nextElementSibling;

    // If we haven't found the span, it might be that reddit changed their DOM. We throw an error and stop the script.
    if (!commentCountSpan) {
        console.error(
            "Could not find the span element that contains the comment count. Reddit might have changed their DOM, please check the script."
        );
        return;
    }

    // Otherwise we parse the comment number and check if it's 0. If it is, we don't have to do anything. The format is "123 comments", so we split the string on the space and take the first element.
    const commentCount = parseInt(
        (commentCountSpan as HTMLElement).innerText.split(" ")[0]
    );

    if (commentCount === 0) {
        // console.log("There are no comments, so we do nothing");
        return;
    }

    // If we get here, we know that there are comments, however we don't know if they're loaded yet. Let's check if we can find some comments and if the length is bigger than 0 we start highlighting.
    const allComments = Array.from(document.querySelectorAll("span")).filter(
        (span) => span.innerText === "level 1"
    );

    if (allComments.length === 0) {
        // console.log("No comments found, so we reinitialise");
        setTimeout(() => {
            initialiser();
        }, 1000);
        return;
    }

    // console.log("We're going to highlight the root comments now");
    // We start by highlighting the initial root comments inside of the comments section.
    highlightRootComments();
    setMutationObserver();
}

function setMutationObserver() {
    const dataScrollerFirstDiv = document.querySelector(
        'div[style*="--commentswrapper"] div[data-scroller-first]'
    );
    const commentWrapper = dataScrollerFirstDiv?.parentElement as HTMLElement;

    if (!commentWrapper) {
        console.error(
            "Couldn't find the comment wrapper, so we can't set the mutation observer"
        );
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // console.log(mutation);
            const divWithStyleProperty: HTMLElement | null = (
                mutation.addedNodes[0] as HTMLElement
            )?.querySelector("div[tabindex='-1']");

            if (!divWithStyleProperty) return;

            if (divWithStyleProperty.getAttribute("style") === "padding-left: 16px;") {
                const levelSpan = divWithStyleProperty.querySelector("span");
                const wrappingDiv = levelSpan?.parentElement;

                if (!wrappingDiv) return;
                highlightComment(wrappingDiv);
            }
        });
    });

    observer.observe(commentWrapper, { childList: true, subtree: false });

    document.addEventListener("custom-navigate", function removeObserver() {
        // console.log("DISCONNECTING");
        observer.disconnect();

        // console.log("REMOVING LISTENER");
        document.removeEventListener("custom-navigate", removeObserver);
    });
}

function highlightRootComments() {
    // console.log("HIGHLIGHTING ALL ROOT COMMENTS");
    const allRootComments = Array.from(document.querySelectorAll("span")).filter(
        (span) => span.innerText === "level 1"
    );

    if (allRootComments.length === 0) {
        // console.log("No root comments found, so we don't do anything");
        return;
    }

    const allRootCommentWrappers = allRootComments.map(
        (comment) => comment.parentElement
    );

    for (let i = 0; i < allRootCommentWrappers.length; i++) {
        if (!(allRootCommentWrappers[i] instanceof HTMLElement)) {
            // console.log("no more elements");
            return;
        }

        highlightComment(allRootCommentWrappers[i] as HTMLElement);
    }
}

function highlightComment(comment: HTMLElement) {
    comment.style.paddingLeft = "10px";
    comment.style.paddingRight = "10px";
    comment.style.borderRadius = "10px";

    if (isDarkMode()) {
        comment.style.backgroundColor = darkMode.backgroundColor;
    } else {
        comment.style.backgroundColor = lightMode.backgroundColor;
    }
}

function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate: boolean = false
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };

        const callNow = immediate && !timeout;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func(...args);
    };
}

initialiser();
