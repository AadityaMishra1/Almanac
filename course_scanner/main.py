#!/usr/bin/env python3
"""
Course Calendar Extractor - CLI Tool

Extracts assignments and due dates from syllabus PDFs, Excel files, or images.
Uses Google Gemini 1.5 Flash for intelligent extraction.

Usage:
    python main.py path/to/syllabus.pdf
    python main.py path/to/schedule.xlsx
    python main.py path/to/image.jpg
"""

import argparse
import sys
import json
import logging
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.logging import RichHandler

from converter import pdf_to_images, excel_to_markdown, load_image
from extractor import extract_schedule

# Setup rich console
console = Console()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True, console=console)]
)
logger = logging.getLogger(__name__)


def detect_file_type(file_path: Path) -> str:
    """
    Detect the type of file based on extension.

    Args:
        file_path: Path to the file

    Returns:
        File type: 'pdf', 'excel', or 'image'

    Raises:
        ValueError: If file type is not supported
    """
    suffix = file_path.suffix.lower()

    if suffix == '.pdf':
        return 'pdf'
    elif suffix in ['.xlsx', '.xls', '.csv']:
        return 'excel'
    elif suffix in ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff']:
        return 'image'
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


def display_results(schedule_data: dict):
    """
    Display the extracted schedule in a pretty table.

    Args:
        schedule_data: Dictionary containing course_name and assignments
    """
    # Display course name
    if schedule_data.get('course_name'):
        console.print(Panel(
            f"[bold cyan]{schedule_data['course_name']}[/bold cyan]",
            title="Course",
            border_style="cyan"
        ))
        console.print()

    # Create table
    table = Table(title="📚 Extracted Assignments", show_header=True, header_style="bold magenta")
    table.add_column("Title", style="cyan", no_wrap=False)
    table.add_column("Due Date", style="green")
    table.add_column("Type", style="yellow")
    table.add_column("Description", style="white", no_wrap=False)

    # Add rows
    assignments = schedule_data.get('assignments', [])

    if not assignments:
        console.print("[yellow]⚠️  No assignments found in the document.[/yellow]")
        return

    for assignment in assignments:
        # Check if date is relative (needs review)
        due_date = assignment['due_date']
        if any(word in due_date.lower() for word in ['week', 'day', 'month']) and '-' not in due_date:
            due_date = f"[yellow]{due_date} ⚠️[/yellow]"

        table.add_row(
            assignment['title'],
            due_date,
            assignment.get('assignment_type', 'N/A') or 'N/A',
            assignment.get('description', '') or ''
        )

    console.print(table)

    # Count warnings
    relative_dates = [a for a in assignments if any(word in a['due_date'].lower() for word in ['week', 'day', 'month']) and '-' not in a['due_date']]
    if relative_dates:
        console.print()
        console.print(f"[yellow]⚠️  {len(relative_dates)} assignment(s) have relative dates that need manual review[/yellow]")


def main():
    """Main CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Extract course assignments and due dates from syllabus documents.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s syllabus.pdf
  %(prog)s schedule.xlsx
  %(prog)s calendar.jpg
  %(prog)s syllabus.pdf --output results.json
  %(prog)s syllabus.pdf --verbose
        """
    )

    parser.add_argument(
        'file',
        type=str,
        help='Path to the syllabus file (PDF, Excel, or Image)'
    )

    parser.add_argument(
        '-o', '--output',
        type=str,
        help='Save results to JSON file instead of displaying in terminal'
    )

    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Validate file exists
    file_path = Path(args.file)
    if not file_path.exists():
        console.print(f"[red]❌ Error: File not found: {file_path}[/red]")
        sys.exit(1)

    try:
        # Display banner
        console.print()
        console.print(Panel.fit(
            "[bold blue]Course Calendar Extractor[/bold blue]\n"
            "Powered by Google Gemini 1.5 Flash",
            border_style="blue"
        ))
        console.print()

        # Detect file type
        file_type = detect_file_type(file_path)
        console.print(f"📄 File type: [cyan]{file_type.upper()}[/cyan]")
        console.print(f"📂 File: [cyan]{file_path.name}[/cyan]")
        console.print()

        # Process based on file type
        with console.status("[bold green]Processing document..."):
            if file_type == 'pdf':
                logger.info("Converting PDF to images...")
                images = pdf_to_images(str(file_path))
                logger.info(f"Converted {len(images)} pages")

                logger.info("Extracting schedule with Gemini...")
                schedule_data = extract_schedule(images, is_text=False)

            elif file_type == 'excel':
                logger.info("Converting Excel to markdown...")
                markdown_text = excel_to_markdown(str(file_path))
                logger.info(f"Converted to markdown ({len(markdown_text)} chars)")

                logger.info("Extracting schedule with Gemini...")
                schedule_data = extract_schedule(markdown_text, is_text=True)

            elif file_type == 'image':
                logger.info("Loading image...")
                image = load_image(str(file_path))
                logger.info("Loaded image successfully")

                logger.info("Extracting schedule with Gemini...")
                schedule_data = extract_schedule([image], is_text=False)

        console.print("[bold green]✅ Extraction complete![/bold green]")
        console.print()

        # Display or save results
        if args.output:
            output_path = Path(args.output)
            with open(output_path, 'w') as f:
                json.dump(schedule_data, f, indent=2)
            console.print(f"[green]💾 Results saved to: {output_path}[/green]")
        else:
            display_results(schedule_data)

        console.print()
        console.print(f"[dim]Total assignments extracted: {len(schedule_data.get('assignments', []))}[/dim]")

    except ValueError as e:
        console.print(f"[red]❌ Configuration Error: {str(e)}[/red]")
        console.print("\n[yellow]💡 Tip: Make sure GEMINI_API_KEY is set in your .env file[/yellow]")
        sys.exit(1)

    except FileNotFoundError as e:
        console.print(f"[red]❌ File Error: {str(e)}[/red]")
        sys.exit(1)

    except Exception as e:
        console.print(f"[red]❌ Error: {str(e)}[/red]")
        if args.verbose:
            console.print_exception()
        sys.exit(1)


if __name__ == '__main__':
    main()
