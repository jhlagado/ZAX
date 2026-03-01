; ZAX lowered .asm trace
; range: $0100..$2001 (end exclusive)

; func touch_scalar_byte_frame begin
touch_scalar_byte_frame:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld B, (ix+$04)                 ; 010B: DD 46 04
ld (ix+$04), B                 ; 010E: DD 70 04
ld H, $0000                    ; 0111: 26 00
ld L, B                        ; 0113: 68
__zax_epilogue_0:
pop DE                         ; 0114: D1
pop BC                         ; 0115: C1
pop AF                         ; 0116: F1
ld SP, IX                      ; 0117: DD F9
pop IX                         ; 0119: DD E1
ret                            ; 011B: C9
; func main begin
; func touch_scalar_byte_frame end
main:
push IX                        ; 011C: DD E5
ld IX, $0000                   ; 011E: DD 21 00 00
add IX, SP                     ; 0122: DD 39
push AF                        ; 0124: F5
push BC                        ; 0125: C5
push DE                        ; 0126: D5
push HL                        ; 0127: E5
ld HL, $0044                   ; 0128: 21 44 00
push HL                        ; 012B: E5
call touch_scalar_byte_frame   ; 012C: CD 00 00
inc SP                         ; 012F: 33
inc SP                         ; 0130: 33
__zax_epilogue_1:
pop HL                         ; 0131: E1
pop DE                         ; 0132: D1
pop BC                         ; 0133: C1
pop AF                         ; 0134: F1
ld SP, IX                      ; 0135: DD F9
pop IX                         ; 0137: DD E1
ret                            ; 0139: C9
; func main end

; symbols:
; label touch_scalar_byte_frame = $0100
; label __zax_epilogue_0 = $0114
; label main = $011C
; label __zax_epilogue_1 = $0131
; data dummy = $2000
