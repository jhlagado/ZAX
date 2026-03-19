; ZAX lowered .asm trace
; range: $0100..$106F (end exclusive)

; func bios_putc begin
bios_putc:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
jp __zax_epilogue_0            ; 010B: C3 00 00
__zax_epilogue_0:
pop DE                         ; 010E: D1
pop BC                         ; 010F: C1
pop AF                         ; 0110: F1
ld SP, IX                      ; 0111: DD F9
pop IX                         ; 0113: DD E1
ret                            ; 0115: C9
; func bios_putc end
; func main begin
main:
push IX                        ; 0116: DD E5
ld IX, $0000                   ; 0118: DD 21 00 00
add IX, SP                     ; 011C: DD 39
push AF                        ; 011E: F5
push BC                        ; 011F: C5
push DE                        ; 0120: D5
push HL                        ; 0121: E5
ld HL, msg                     ; 0122: 21 00 00
ld BC, MsgLen                  ; 0125: 01 0A 00
loop:
ld A, (hl)                     ; 0128: 7E
push BC                        ; 0129: C5
ld H, $0000                    ; 012A: 26 00
ld L, A                        ; 012C: 6F
push HL                        ; 012D: E5
call bios_putc                 ; 012E: CD 00 00
inc SP                         ; 0131: 33
inc SP                         ; 0132: 33
pop BC                         ; 0133: C1
inc HL                         ; 0134: 23
dec BC                         ; 0135: 0B
ld A, B                        ; 0136: 78
or C                           ; 0137: B1
jp NZ, loop                    ; 0138: C2 00 00
__zax_epilogue_1:
pop HL                         ; 013B: E1
pop DE                         ; 013C: D1
pop BC                         ; 013D: C1
pop AF                         ; 013E: F1
ld SP, IX                      ; 013F: DD F9
pop IX                         ; 0141: DD E1
ret                            ; 0143: C9
; func main end

; symbols:
; label bios_putc = $0100
; label __zax_epilogue_0 = $010E
; label main = $0116
; label loop = $0128
; label __zax_epilogue_1 = $013B
; data msg = $1000
; label __zax_startup = $1010
; constant MsgLen = $000A (10)
