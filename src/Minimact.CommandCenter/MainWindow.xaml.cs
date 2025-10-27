using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace Minimact.CommandCenter;

/// <summary>
/// Interaction logic for MainWindow.xaml
/// </summary>
public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        // Start playing Zordon video when window loads
        Loaded += MainWindow_Loaded;
    }

    private void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        // Start playing Zordon video
        ZordonVideo.Play();
    }

    private void ZordonVideo_MediaEnded(object sender, RoutedEventArgs e)
    {
        // Loop the video
        ZordonVideo.Position = TimeSpan.Zero;
        ZordonVideo.Play();
    }
}