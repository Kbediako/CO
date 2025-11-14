jQuery(document).ready(function ($) {
	const popup = document.getElementById("custom-popup");
	const closeBtn = popup ? popup.querySelector(".popup-close") : null;
	const declineBtn = popup ? popup.querySelector(".popup-btn.decline") : null;
	
	if (popup && !sessionStorage.getItem("popupShown")) {
		setTimeout(() => {
			popup.classList.add("active");
			sessionStorage.setItem("popupShown", "true");
		}, 5000);
	}

	function closePopup() {
		if (popup) {
			popup.classList.add("blur-out");
			popup.classList.remove("active");
		}
	}

	if (closeBtn) closeBtn.addEventListener("click", closePopup);
	if (declineBtn) declineBtn.addEventListener("click", closePopup);
	if (popup) {
		popup.addEventListener("click", function (e) {
			if (e.target === popup) closePopup();
		});
	}

	const $emailInput = $('#popup-email-input');
	const $errorMessage = $('.popup-error-message');
	const $confirmBtn = $('.popup-btn.confirm');
	let typingTimer;
	const typingDelay = 800;

	function isValidEmail(email) {
		const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const strictRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		return regex.test(email) && strictRegex.test(email);
	}

	function showMessage(message, type = 'error') {
		$errorMessage.text(message);
		$errorMessage.removeClass('show success');
		
		if (type === 'success') {
			$errorMessage.addClass('success');
		}
		
		setTimeout(() => {
			$errorMessage.addClass('show');
		}, 10);
	}

	function hideMessage() {
		$errorMessage.removeClass('show');
	}

	function setInputState(state) {
		$emailInput.removeClass('error success');
		if (state === 'error') {
			$emailInput.addClass('error');
		} else if (state === 'success') {
			$emailInput.addClass('success');
		}
	}

	$emailInput.on('input', function () {
		clearTimeout(typingTimer);
		const email = $(this).val().trim();

		if (email === '') {
			hideMessage();
			setInputState('');
			return;
		}

		typingTimer = setTimeout(() => {
			if (!isValidEmail(email)) {
				setInputState('error');
				showMessage('Please enter a valid email');
			} else {
				setInputState('success');
				hideMessage();
			}
		}, typingDelay);
	});

	$emailInput.on('blur', function () {
		const email = $(this).val().trim();
		if (email !== '' && !isValidEmail(email)) {
			setInputState('error');
			showMessage('Please enter a valid email');
		}
	});

	$emailInput.on('focus', function () {
		const email = $(this).val().trim();
		if (email === '') {
			hideMessage();
			setInputState('');
		}
	});

	$emailInput.on('keypress', function (e) {
		if (e.which === 13 || e.keyCode === 13) {
			e.preventDefault();
			$confirmBtn.trigger('click');
		}
	});

	$confirmBtn.on('click', function (e) {
		e.preventDefault();
		const email = $emailInput.val().trim();

		if (email === '') {
			setInputState('error');
			showMessage('Please enter your email');
			return;
		}

		if (!isValidEmail(email)) {
			setInputState('error');
			showMessage('Please enter a valid email');
			return;
		}

		$confirmBtn.prop('disabled', true).text('Sending...');
		setInputState('');
		showMessage('Sending coupon...', 'success');

		$.post(popupCouponData.ajax_url, {
			action: 'send_coupon_email',
			email,
			nonce: popupCouponData.nonce
		})
		.done(function (response) {
			console.log('Response:', response);
			
			if (response.success) {
				setInputState('success');
				showMessage('Check your email, we sent you your coupon!', 'success');
				$confirmBtn.hide();
				$('.popup-btn.decline').hide();
				$emailInput.prop('disabled', true);
			} else {
				setInputState('error');
				$confirmBtn.prop('disabled', false).text($confirmBtn.data('original-text') || 'Subscribe');
				
				switch (response.data) {
					case 'existing_user':
						showMessage('You already have a registered account with this email');
						break;
					case 'invalid_email':
						showMessage('Please enter a valid email');
						break;
					case 'no_coupon_set':
						showMessage('No coupon has been configured. Contact the administrator.');
						break;
					default:
						showMessage('There was an error sending the email. Please try again.');
				}
			}
		})
		.fail(function () {
			setInputState('error');
			showMessage('Connection error. Please try again.');
			$confirmBtn.prop('disabled', false).text($confirmBtn.data('original-text') || 'Subscribe');
		});
	});

	$confirmBtn.data('original-text', $confirmBtn.text());
});