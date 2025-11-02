using System;
using System.Drawing;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();

        // Single overlay spanning ALL screens
        var all = Screen.AllScreens.Select(s => s.Bounds).Aggregate(Rectangle.Union);
        using var ctx = new OverlayContext(all);
        Application.Run(ctx);
    }
}

sealed class OverlayContext : ApplicationContext
{
    private readonly OverlayForm _overlay;
    private readonly NotifyIcon _tray;

    public OverlayContext(Rectangle bounds)
    {
        _overlay = new OverlayForm(bounds);
        _overlay.Show();

        _tray = new NotifyIcon
        {
            Visible = true,
            Text = "ClickThrough Overlay",
            Icon = SystemIcons.Information
        };

        var menu = new ContextMenuStrip();
        var toggle = new ToolStripMenuItem("Toggle click-through", null, (_, __) => _overlay.ToggleClickThrough());
        var exit = new ToolStripMenuItem("Exit", null, (_, __) => ExitThread());
        menu.Items.Add(toggle);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(exit);

        _tray.ContextMenuStrip = menu;
    }

    protected override void ExitThreadCore()
    {
        _tray.Visible = false;
        _tray.Dispose();
        _overlay.Close();
        _overlay.Dispose();
        base.ExitThreadCore();
    }
}

sealed class OverlayForm : Form
{
    // Win32 styles
    const int GWL_EXSTYLE = -20;
    const int WS_EX_TRANSPARENT = 0x20;
    const int WS_EX_LAYERED = 0x80000;
    const int WS_EX_TOOLWINDOW = 0x00000080; // hides from Alt+Tab
    const int WS_EX_NOACTIVATE = 0x08000000; // don't steal focus

    [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    private bool _clickThrough = true;
    private readonly Timer _timer = new Timer();
    private double _phase;

    public OverlayForm(Rectangle bounds)
    {
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        Bounds = bounds;
        TopMost = true;

        // Transparency trick: everything painted with BackColor becomes fully transparent
        BackColor = Color.Lime;
        TransparencyKey = Color.Lime;

        // Smooth repaints
        DoubleBuffered = true;

        // Gentle animation timer
        _timer.Interval = 16; // ~60 FPS
        _timer.Tick += (_, __) => { _phase += 0.03; Invalidate(); };
        _timer.Start();
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        ApplyExtendedStyles();
    }

    public void ToggleClickThrough()
    {
        _clickThrough = !_clickThrough;
        ApplyExtendedStyles();
    }

    private void ApplyExtendedStyles()
    {
        int ex = GetWindowLong(Handle, GWL_EXSTYLE);
        ex |= WS_EX_LAYERED | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;

        if (_clickThrough)
            ex |= WS_EX_TRANSPARENT;
        else
            ex &= ~WS_EX_TRANSPARENT;

        SetWindowLong(Handle, GWL_EXSTYLE, ex);
        Text = _clickThrough ? "Overlay (click-through)" : "Overlay (interactive)";
    }

    protected override CreateParams CreateParams
    {
        get
        {
            var cp = base.CreateParams;
            // Make sure it's topmost at creation time
            cp.ExStyle |= WS_EX_LAYERED | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
            return cp;
        }
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var g = e.Graphics;
        g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;

        // Center of the primary screen area within this window
        var center = new Point(Bounds.Width / 2, Bounds.Height / 2);

        // Pulse radius
        float baseR = 90f;
        float amp = 18f;
        float r = baseR + (float)(Math.Sin(_phase) * amp);

        // Outer soft glow
        using (var brushOuter = new SolidBrush(Color.FromArgb(40, 0, 128, 255)))
            g.FillEllipse(brushOuter, center.X - r - 30, center.Y - r - 30, (r + 30) * 2, (r + 30) * 2);

        // Main disk
        using (var brush = new SolidBrush(Color.FromArgb(75, 0, 160, 255)))
            g.FillEllipse(brush, center.X - r, center.Y - r, r * 2, r * 2);

        // Ring
        using (var pen = new Pen(Color.FromArgb(130, 0, 200, 255), 4))
            g.DrawEllipse(pen, center.X - r, center.Y - r, r * 2, r * 2);

        // Label
        var s = _clickThrough ? "Click-through overlay demo" : "Interactive overlay (clicks captured)";
        using var labelBrush = new SolidBrush(Color.FromArgb(200, 240, 240, 240));
        using var font = new Font("Segoe UI", 12, FontStyle.Regular);
        var size = g.MeasureString(s, font);
        g.DrawString(s, font, labelBrush, new PointF(center.X - size.Width / 2, center.Y + r + 20));
    }
}
