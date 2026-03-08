; ZAX lowered .asm trace
; range: $0100..$1055 (end exclusive)

; func read_counter begin
read_counter:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld hl, (counter)               ; 010B: 2A 00 00
__zax_epilogue_0:
pop DE                         ; 010E: D1
pop BC                         ; 010F: C1
pop AF                         ; 0110: F1
ld SP, IX                      ; 0111: DD F9
pop IX                         ; 0113: DD E1
ret                            ; 0115: C9
; func read_counter end
; func write_counter begin
write_counter:
push IX                        ; 0116: DD E5
ld IX, $0000                   ; 0118: DD 21 00 00
add IX, SP                     ; 011C: DD 39
push AF                        ; 011E: F5
push BC                        ; 011F: C5
push DE                        ; 0120: D5
push HL                        ; 0121: E5
ld E, (IX + $0004)             ; 0122: DD 5E 04
ld D, (IX + $0005)             ; 0125: DD 56 05
ld (counter), DE               ; 0128: ED 53 00 00
__zax_epilogue_1:
pop HL                         ; 012C: E1
pop DE                         ; 012D: D1
pop BC                         ; 012E: C1
pop AF                         ; 012F: F1
ld SP, IX                      ; 0130: DD F9
pop IX                         ; 0132: DD E1
ret                            ; 0134: C9
; func main begin
; func write_counter end
main:
push IX                        ; 0135: DD E5
ld IX, $0000                   ; 0137: DD 21 00 00
add IX, SP                     ; 013B: DD 39
push AF                        ; 013D: F5
push BC                        ; 013E: C5
push DE                        ; 013F: D5
push HL                        ; 0140: E5
ld HL, $007B                   ; 0141: 21 7B 00
push HL                        ; 0144: E5
call write_counter             ; 0145: CD 00 00
inc SP                         ; 0148: 33
inc SP                         ; 0149: 33
ld hl, (counter)               ; 014A: 2A 00 00
__zax_epilogue_2:
pop HL                         ; 014D: E1
pop DE                         ; 014E: D1
pop BC                         ; 014F: C1
pop AF                         ; 0150: F1
ld SP, IX                      ; 0151: DD F9
pop IX                         ; 0153: DD E1
ret                            ; 0155: C9
; func main end

; symbols:
; label read_counter = $0100
; label __zax_epilogue_0 = $010E
; label write_counter = $0116
; label __zax_epilogue_1 = $012C
; label main = $0135
; label __zax_epilogue_2 = $014D
; data counter = $1000
; label __zax_startup = $1002
