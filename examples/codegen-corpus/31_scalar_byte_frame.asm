; ZAX lowered .asm trace
; range: $0100..$2053 (end exclusive)

; func touch_scalar_byte_frame begin
touch_scalar_byte_frame:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
push IX                        ; 010E: DD E5
pop HL                         ; 0110: E1
ld DE, $0004                   ; 0111: 11 04 00
add HL, DE                     ; 0114: 19
push HL                        ; 0115: E5
pop HL                         ; 0116: E1
pop DE                         ; 0117: D1
pop BC                         ; 0118: C1
pop AF                         ; 0119: F1
ld B, (hl)                     ; 011A: 46
push AF                        ; 011B: F5
push BC                        ; 011C: C5
push DE                        ; 011D: D5
push IX                        ; 011E: DD E5
pop HL                         ; 0120: E1
ld DE, $0004                   ; 0121: 11 04 00
add HL, DE                     ; 0124: 19
push HL                        ; 0125: E5
pop HL                         ; 0126: E1
pop DE                         ; 0127: D1
pop BC                         ; 0128: C1
pop AF                         ; 0129: F1
ld (hl), B                     ; 012A: 70
ld H, $0000                    ; 012B: 26 00
ld L, B                        ; 012D: 68
__zax_epilogue_0:
pop DE                         ; 012E: D1
pop BC                         ; 012F: C1
pop AF                         ; 0130: F1
ld SP, IX                      ; 0131: DD F9
pop IX                         ; 0133: DD E1
ret                            ; 0135: C9
; func main begin
; func touch_scalar_byte_frame end
main:
push IX                        ; 0136: DD E5
ld IX, $0000                   ; 0138: DD 21 00 00
add IX, SP                     ; 013C: DD 39
push AF                        ; 013E: F5
push BC                        ; 013F: C5
push DE                        ; 0140: D5
push HL                        ; 0141: E5
ld HL, $0044                   ; 0142: 21 44 00
push HL                        ; 0145: E5
call touch_scalar_byte_frame   ; 0146: CD 00 00
inc SP                         ; 0149: 33
inc SP                         ; 014A: 33
__zax_epilogue_1:
pop HL                         ; 014B: E1
pop DE                         ; 014C: D1
pop BC                         ; 014D: C1
pop AF                         ; 014E: F1
ld SP, IX                      ; 014F: DD F9
pop IX                         ; 0151: DD E1
ret                            ; 0153: C9
; func main end

; symbols:
; label touch_scalar_byte_frame = $0100
; label __zax_epilogue_0 = $012E
; label main = $0136
; label __zax_epilogue_1 = $014B
; data dummy = $2000
; label __zax_startup = $2001
