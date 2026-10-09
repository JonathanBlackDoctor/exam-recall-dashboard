$ErrorActionPreference = 'Stop'
$credentialPath = Join-Path $PSScriptRoot '../.private/password.dpapi'
if (-not (Test-Path -LiteralPath $credentialPath)) { throw '이 PC에 저장된 접속 비밀번호가 없습니다.' }
$secureValue = (Get-Content -LiteralPath $credentialPath -Raw).Trim() | ConvertTo-SecureString
$credential = New-Object System.Management.Automation.PSCredential('dashboard', $secureValue)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object System.Windows.Forms.Form
$form.Text = '복기 기록 접속 비밀번호'
$form.Size = New-Object System.Drawing.Size(430, 230)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$label = New-Object System.Windows.Forms.Label
$label.Text = '이 비밀번호로 복기 기록 사이트를 열 수 있습니다.'
$label.Location = New-Object System.Drawing.Point(22, 20)
$label.AutoSize = $true
$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = New-Object System.Drawing.Point(22, 55)
$textBox.Size = New-Object System.Drawing.Size(365, 35)
$textBox.Font = New-Object System.Drawing.Font('Segoe UI', 15)
$textBox.ReadOnly = $true
$textBox.Text = $credential.GetNetworkCredential().Password
$copyButton = New-Object System.Windows.Forms.Button
$copyButton.Text = '비밀번호 복사'
$copyButton.Location = New-Object System.Drawing.Point(22, 110)
$copyButton.Size = New-Object System.Drawing.Size(150, 35)
$copyButton.Add_Click({ [System.Windows.Forms.Clipboard]::SetText($textBox.Text); $copyButton.Text = '복사했습니다' })
$openButton = New-Object System.Windows.Forms.Button
$openButton.Text = '사이트 열기'
$openButton.Location = New-Object System.Drawing.Point(190, 110)
$openButton.Size = New-Object System.Drawing.Size(197, 35)
$openButton.Add_Click({ Start-Process 'https://jonathanblackdoctor.github.io/exam-recall-dashboard/' })
$form.Controls.AddRange(@($label, $textBox, $copyButton, $openButton))
[void] $form.ShowDialog()
$textBox.Text = ''
