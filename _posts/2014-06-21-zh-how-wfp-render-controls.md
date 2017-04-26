---
layout: post
title: WFP 控件重绘的底层控制 （自制底层控件时，必须了解的那些事）
---

久闻WFP利用DirectX引擎渲染界面，以达到高性能UI的效果，但是见多了用WPF写烂的东西，心想这种东西肯定是要充分利用自身的机制而避免自己实现Buffer、重绘判断什么的。
所以研究了一下，如果才能充分利用这个机制实现性能优秀的界面。

WPF构架
----
### 实现构架
[img]http://i.msdn.microsoft.com/dynimg/IC159631.png[/img]
当然得从构架说起，微软官方有这么一幅，很能说明问题。
首先DirectX被放置于CLR之下，也就是说开发者没有能力实际直接利用WPF控制DirectX。事实上微软一直没有提供很好的CLR层的DirectX接口，原因我猜是因为这层太过于性能敏感，官方说其milcore就是精心写的小东西，本身已具有CLR的跨平台性，但是为了性能牺牲了很多CLR的特性。
在显示方面，WPF强调的是一种，非像素级别的，逻辑地UI显示。换句话说，绘图过程不再是“从某点到某点画根线”，而是生成“一根从某点到某点的线”，并把它作为对象托管处理。

### 最小显示单元：Visual
System.Windows.Media.Visual 是显示方面的最小显示单元，这些单元最终以树状的形式存在和管理，比如刚才说的“一根从某点到某点画的线”，最后就存在于一个 Visual 树上。值得注意的是，Visual 本身既是显示的最小单元，同时又实现了树状结构的接口，但是Visual并不会主动的去绘制其子Visual（我想这应该是给程序员权利动态调整 Visual 树的权利）。
这个设计的合理性我表示怀疑，因为这会导致 Visual 的继承类在行为上显得非常有歧义。如很多人认为 Control 在调用 AddVisualChild 以后，这个Child就能够被自动管理和显示了，其实 AddVisualChild 只是 Control 继承 Visual 的结果。
既然如此，为什么还要强调这个树结构本身，我想，是出于管理（如对象回收、消息处理）的考虑吧。

### UIElement、FrameworkElement
System.Windows.UIElement 是UI基本的最小单元，他已经包含了基本的UI处理需要的基本内容，如事件处理，如 RenderSize 方法，它本身包含一个 Visual 树。
System.Windows.FrameworkElement 则提供了一个更高级别的抽象，一些属性如 ActualHeight、Cursor 等实际在UI层面需要的属性。
一般来说，如果想要做比较底层的界面控件，可以根据需要从FrameworkElement继承，并且从UIElement继承出一些子类容，比如，一个光标，一个分界线。
UIElement提供了对属性的回调控制，如可设定当某属性被更改时，调用某回调函数。FrameworkElement 则提供更加实用的控制，如某属性更改时，调用重绘，某熟悉更改时，重新计算控件大小云云。

### Control、UserControl、Panel
Control相比FrameworkElement，并没有实质性的区别，它仅仅是一些行为更方便实用的包装，他直接提供了Padding、Background这种比较通用的属性（虽然你可能选择无视这些属性）。
UserControl则是更方便一些，它会假设的他的 Child 均为 Control，并且自动完成 Children 的管理。UserControl完全不算底层了，所以不再本文的讨论范围。
Panel则是跟Control同级别的东西，不过Panel的提供的接口使其更适合堆砌元素。

### 终述
如果要自定义一个控件，最合适的手段，是从Control、Panel、FrameworkElement继承并且修改，事实上微软自己的控件也是这么处理的，不要在乎“Control”这个名字好像是专门给控件用的，其实它只是定义了一些通用的属性什么的。但是官方还是建议直接使用Control和Panel，因为他们封装的那些属性很实用。
控件内部的小元素，可以使用UIElement、FrameworkElement包装，它们都有独立的可修改的OnRender事件，并且不会触发父级直接重绘。所以除非知道你在做什么，否则不要直接使用Visual，Visual更适合作为一个静态的，不变化的东西。

绘制过程
----
### Layout
Layout 系统是 WPF 里显示管理的核心机制，相当于是使用一种通用的方法在控制控件之间的排列、显示和重绘。换句话说，在WIN32里，WM_SIZE和WM_PAINT里的大多数事情现在直接由Layout托管了。当然控件需要合理地汇报属性以满足Layout要求。
一次 Layout 触发的过程可能是这样：
1、一个控件的某个属性被更改，它可能会变大变小或者重绘。
2、父节点触发各个子节点 Measure，看自己的其他子节点是否需要调整。
3、父节点触发各个子节点 Arrange，告知其最终范围，该行为一般会触发子节点的重绘。
### Measure，Arrange
在上述过程中，Measure，Arrange是父节点和子节点交互的重要过程，Measure通知子节点根据需要调整属性，并且反馈最终的变化。Arrange则是父节点告知子节点最终的处理结果，并且可能触发重绘。
### MeasureOverride，ArrangeOverride
刚才我们提到父节点通知子节点进行Measure和Arrange。实际上这是个递归的过程，也就是父节点也需要自己的Measure和Arrange。微软选择把这两个逻辑分开，实际的过程如下。
1、父节点被调用Measure，此时父节点应该对自身进行Measure。
2、父节点被调用MeasureOverride，此时父节点应该主动调用所有子节点的Measure。
3、父节点被调用Arrange。
3、父节点被调用ArrangeOverride，并且父节点主动调用所有子节点的Arrange。
在这个过程中，父节点两个函数里是需要主动行为的，MeasureOverride和ArrangeOverride。实际上，我们通常要重载这两个函数。
### OnRender
实际的重绘过程，参数是一个DrawingContext。
值得注意的是，无论UIElement还是FrameworkElement，均没有能力直接获取和生成这个DrawingContext，因此他们没有能力直接重绘，必须通过触发Layout才能重绘。能够看到官方似乎在有意回避这个问题，估计是想实现某种程序的抽象。
### 触发机制和避免重绘
要清楚哪些属性更改才会触发重绘，对于FrameworkElement来说，便是要小心处理 AffectsMeasure and AffectsArrange 的属性。
避免调用UpdateLayout。
谨慎使用InvalidateVisual，他可以理解为是UpdateArrange，但是会触发UpdateLayout，很多人发现这个函数能主动刷新界面而频繁的调用，刷新的过程应该由WPF托管和优化。
界面上的一些频繁变化的小东西，如“光标”，应该独立作为一个UIElement，其出发重绘时不会触发父级Layout。

简单实例
----
### Caret
Caret即光标，一般特指文本输入时候的显示的一闪一闪的东西。
Cursor也翻译做光标，但是一般指鼠标的那个指针。
一个简单的光标可以这么做，注意到使用的是DispatcherTimer，并且是利用调用InvalidateVisual实现刷新闪烁。
	class Caret : UIElement
	{
	    public int Column { get; set; }
	    public int Row { get; set; }
	    Pen CharPen;
	    Size CharSize;
	    bool BlinkVisible;
	    DispatcherTimer BlinkTimer;
	    public Caret()
	    {
	        CharPen = new Pen(Brushes.White, 2);
	        CharSize = new Size(7, 14);
	        BlinkVisible = true;
	        BlinkTimer = new DispatcherTimer();
	        BlinkTimer.Interval = new TimeSpan(0, 0, 0, 0, 500);
	        BlinkTimer.Tick += new EventHandler(Blink);
	        BlinkTimer.Start();
	    }
	    void Blink(object sender, EventArgs e)
	    {
	        BlinkVisible = !BlinkVisible;
	        Refresh();
	    }
	    void Refresh()
	    {
	        InvalidateVisual();
	    }
	    protected override void OnRender(DrawingContext dc)
	    {
	        if (BlinkVisible)
	        {
	            Point coordinate = new Point();
	            coordinate.Y = (double) Row * CharSize.Height;
	            coordinate.X = Column * CharSize.Width;
	            dc.DrawLine(CharPen, coordinate, new Point(coordinate.X, coordinate.Y + CharSize.Height));
	        }
	    }
	}
注意到这里如果更新Row、Column属性后，必须手动调用Refresh触发重绘。如果想自动实现呢，可以使用DependencyProperty指定PropertyChangedCallback。
如
	public int Row {
	    get { return (int)GetValue(RowProperty); }
	    set { SetValue(RowProperty, value); }
	}
	static DependencyProperty RowProperty = DependencyProperty.Register("Row", typeof(int), typeof(Caret), new PropertyMetadata(0, new PropertyChangedCallback(PropertyChanged)));
	static void PropertyChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
	{
	    Caret caret = (Caret)d;
	    caret.Refresh();
	}
这样每当Row被更改时，都能自动触发Refresh。
这里使用的是UIElement，如果使用FrameworkElement，则更加方便些。
	static DependencyProperty RowProperty = DependencyProperty.Register("Row", typeof(int), typeof(Caret), new FrameworkPropertyMetadata(0, FrameworkPropertyMetadataOptions.AffectsRender));
FrameworkPropertyMetadataOptions.AffectsRender能够自动触发重绘。（官方的文档视乎在暗示可能不会触发Arrange和Measure，实测是触发的。其父类UIElement也没有能力在不触发Layout的情况下直接触发OnRender）

LogicChildren
----
一般来说，一个FrameworkElement只能有0个或者1个Visual作为逻辑Children，如果要实现多个，比如要做一个排版控件，就可以选择重写逻辑树。
重写逻辑树使得该控件可以使用如xaml进行逻辑控制。如果只是一个控件内部显示多个子元素，则不应该使用LogicChildren。
http://msdn.microsoft.com/en-us/library/ms742244.aspx

VisualChildren
----
相比LogicChildren，VisualChildren则是单纯的控制显示，对于自定控件来说，如果要自己控制VisualChildren，则必须实现以下操作。
重载
GetVisualChild
VisualChildrenCount
使WPF能够获得VisualChild
重载
MeasureOverride
ArrangeOverride
其中ArrangeOverride是必要的，MeasureOverride如果你的控件100%不会变化，可以无视。
### 示例
VisualCollection 是管理VisualChild的最佳手段。
	VisualCollection VisualChildren = new VisualCollection(this);
	VisualChildren.Add(...);
	protected override int VisualChildrenCount { get { return VisualChildren.Count; } }
	protected override Visual GetVisualChild(int index) { return VisualChildren[index]; }
	
	protected override Size MeasureOverride(Size availableSize)
	{
		// 可根据实际需要进行 Measure
	    return availableSize;
	}
	
	protected override Size ArrangeOverride(Size finalSize)
	{
	    Rect arrangeRect = new Rect()
	    {
	        Width = finalSize.Width,
	        Height = finalSize.Height
	    };
	    foreach(UIElement child in VisualChildren) {
	        child.Arrange(arrangeRect);
	    }
	    return finalSize;
	}
