/**
 * Generates HTML for the motivational achievement panel
 */
export function getMotivationalHtml(title: string, achievements: string[], outro: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Your Achievements</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 100vh;
			padding: 40px;
			overflow-y: auto;
		}
		
		.container {
			max-width: 800px;
			width: 100%;
			background: rgba(255, 255, 255, 0.1);
			backdrop-filter: blur(10px);
			border-radius: 24px;
			padding: 60px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			border: 1px solid rgba(255, 255, 255, 0.2);
			animation: slideIn 0.5s ease-out;
		}
		
		@keyframes slideIn {
			from {
				opacity: 0;
				transform: translateY(-30px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
		
		.title {
			font-size: 42px;
			font-weight: 700;
			margin-bottom: 48px;
			text-align: center;
			line-height: 1.3;
			text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
		}
		
		.achievements {
			margin-bottom: 48px;
		}
		
		.achievement {
			font-size: 24px;
			margin: 24px 0;
			padding: 20px 28px;
			background: rgba(255, 255, 255, 0.15);
			border-radius: 16px;
			backdrop-filter: blur(5px);
			border: 1px solid rgba(255, 255, 255, 0.2);
			animation: fadeIn 0.6s ease-out forwards;
			opacity: 0;
			box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		}
		
		.achievement:nth-child(1) { animation-delay: 0.1s; }
		.achievement:nth-child(2) { animation-delay: 0.2s; }
		.achievement:nth-child(3) { animation-delay: 0.3s; }
		.achievement:nth-child(4) { animation-delay: 0.4s; }
		.achievement:nth-child(5) { animation-delay: 0.5s; }
		
		@keyframes fadeIn {
			to {
				opacity: 1;
			}
		}
		
		.outro {
			font-size: 26px;
			text-align: center;
			font-weight: 600;
			padding: 32px;
			background: rgba(255, 255, 255, 0.2);
			border-radius: 16px;
			line-height: 1.5;
			animation: pulse 2s ease-in-out infinite;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		}
		
		@keyframes pulse {
			0%, 100% {
				transform: scale(1);
			}
			50% {
				transform: scale(1.02);
			}
		}
		
		.sparkles {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			z-index: -1;
		}
		
		.sparkle {
			position: absolute;
			font-size: 24px;
			animation: float 3s ease-in-out infinite;
			opacity: 0.6;
		}
		
		@keyframes float {
			0%, 100% {
				transform: translateY(0) rotate(0deg);
			}
			50% {
				transform: translateY(-20px) rotate(180deg);
			}
		}
		
		.empty-state {
			text-align: center;
			padding: 40px;
			font-size: 22px;
			line-height: 1.6;
		}
	</style>
</head>
<body>
	<div class="sparkles">
		<span class="sparkle" style="top: 10%; left: 10%; animation-delay: 0s;">✨</span>
		<span class="sparkle" style="top: 20%; left: 80%; animation-delay: 0.5s;">⭐</span>
		<span class="sparkle" style="top: 70%; left: 15%; animation-delay: 1s;">🌟</span>
		<span class="sparkle" style="top: 60%; left: 85%; animation-delay: 1.5s;">💫</span>
		<span class="sparkle" style="top: 40%; left: 5%; animation-delay: 2s;">✨</span>
		<span class="sparkle" style="top: 80%; left: 70%; animation-delay: 2.5s;">⭐</span>
	</div>
	
	<div class="container">
		<h1 class="title">${title}</h1>
		
		${achievements.length > 0 ? `
			<div class="achievements">
				${achievements.map(achievement => `<div class="achievement">${achievement}</div>`).join('')}
			</div>
		` : `
			<div class="empty-state">
				No achievements tracked yet in this time period, but keep coding! Every line is progress. 🚀
			</div>
		`}
		
		<div class="outro">${outro}</div>
	</div>
</body>
</html>`;
}
